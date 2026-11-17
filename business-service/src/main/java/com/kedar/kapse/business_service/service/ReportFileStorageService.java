package com.kedar.kapse.business_service.service;

import com.kedar.kapse.platform_core.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Stores report files in S3 under reports/{tenant}/{uuid}-{name}.
 * Every read checks the key starts with the caller's own tenant prefix, so one
 * hospital can never read another hospital's files by guessing a key.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportFileStorageService {

    private static final Pattern SAFE_TENANT = Pattern.compile("[A-Za-z0-9_-]+");
    private static final int MAX_NAME_LENGTH = 100;

    private final S3Client s3;
    private final S3Presigner presigner;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.s3.presigned-url-minutes}")
    private long linkMinutes;

    public String upload(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "File is empty");
        }
        String key = tenantPrefix() + UUID.randomUUID() + "-" + safeName(file.getOriginalFilename());
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(file.getContentType())
                .build();
        try (InputStream in = file.getInputStream()) {
            s3.putObject(request, RequestBody.fromInputStream(in, file.getSize()));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        // Key not logged: it contains the original file name, which may hold patient details.
        log.info("Uploaded report file for tenant={} size={}B", TenantContext.getRequiredTenantId(), file.getSize());
        return key;
    }

    public ResponseBytes<GetObjectResponse> download(String key) {
        requireOwnKey(key);
        try {
            return s3.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (NoSuchKeyException e) {
            throw new ResponseStatusException(NOT_FOUND, "File not found");
        }
    }

    public String createDownloadLink(String key) {
        requireOwnKey(key);
        GetObjectPresignRequest request = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(linkMinutes))
                .getObjectRequest(r -> r.bucket(bucket).key(key))
                .build();
        return presigner.presignGetObject(request).url().toString();
    }

    public long linkMinutes() {
        return linkMinutes;
    }

    private String tenantPrefix() {
        String tenant = TenantContext.getRequiredTenantId();
        if (!SAFE_TENANT.matcher(tenant).matches()) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid tenant");
        }
        return "reports/" + tenant + "/";
    }

    private void requireOwnKey(String key) {
        if (key == null || key.contains("..") || !key.startsWith(tenantPrefix())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your file");
        }
    }

    private static String safeName(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "file";
        }
        String name = originalName.substring(Math.max(originalName.lastIndexOf('/'), originalName.lastIndexOf('\\')) + 1);
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");
        if (name.isEmpty()) {
            return "file";
        }
        return name.length() > MAX_NAME_LENGTH ? name.substring(name.length() - MAX_NAME_LENGTH) : name;
    }
}

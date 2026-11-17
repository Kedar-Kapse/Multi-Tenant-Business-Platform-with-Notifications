package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.service.ReportFileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.Map;

@RestController
@RequestMapping("/api/report-files")
@RequiredArgsConstructor
public class ReportFileController {

    private final ReportFileStorageService storage;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER')")
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("key", storage.upload(file)));
    }

    @GetMapping("/download")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'PHYSICIAN', 'NURSE', 'THERAPIST')")
    public ResponseEntity<byte[]> download(@RequestParam String key) {
        ResponseBytes<GetObjectResponse> file = storage.download(key);
        String fileName = key.substring(key.lastIndexOf('/') + 1);
        // Always "attachment": the browser saves the file instead of rendering it,
        // so an uploaded HTML/SVG file can't run scripts on our domain.
        return ResponseEntity.ok()
                .contentType(mediaTypeOf(file.response().contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(fileName).build().toString())
                .body(file.asByteArray());
    }

    @GetMapping("/link")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'PHYSICIAN', 'NURSE', 'THERAPIST')")
    public Map<String, Object> link(@RequestParam String key) {
        return Map.of("url", storage.createDownloadLink(key), "expiresInMinutes", storage.linkMinutes());
    }

    private static MediaType mediaTypeOf(String contentType) {
        if (contentType == null) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(contentType);
        } catch (InvalidMediaTypeException e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}

package com.kedar.kapse.business_service.service;

import com.kedar.kapse.platform_core.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ReportFileStorageServiceTest {

    @Mock private S3Client s3;
    @Mock private S3Presigner presigner;

    private ReportFileStorageService service;

    @BeforeEach
    void setUp() {
        service = new ReportFileStorageService(s3, presigner);
        ReflectionTestUtils.setField(service, "bucket", "test-bucket");
        ReflectionTestUtils.setField(service, "linkMinutes", 5L);
        TenantContext.setTenantId("hospital-a");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void uploadStoresFileUnderOwnTenantWithSafeName() {
        MockMultipartFile file = new MockMultipartFile("file", "../my report.pdf", "application/pdf", new byte[]{1, 2, 3});

        String key = service.upload(file);

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3).putObject(request.capture(), any(RequestBody.class));
        assertThat(request.getValue().bucket()).isEqualTo("test-bucket");
        assertThat(request.getValue().key()).isEqualTo(key);
        assertThat(key).startsWith("reports/hospital-a/").endsWith("-my_report.pdf");
    }

    @Test
    void rejectsEmptyFile() {
        MockMultipartFile empty = new MockMultipartFile("file", "x.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> service.upload(empty))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
        verifyNoInteractions(s3);
    }

    @Test
    void cannotDownloadAnotherTenantsFile() {
        assertForbidden("reports/hospital-b/123-report.pdf");
    }

    @Test
    void cannotEscapeOwnFolderWithDotDot() {
        assertForbidden("reports/hospital-a/../hospital-b/123-report.pdf");
    }

    @Test
    void cannotGetLinkForAnotherTenantsFile() {
        assertThatThrownBy(() -> service.createDownloadLink("reports/hospital-b/123-report.pdf"))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(presigner);
    }

    private void assertForbidden(String key) {
        assertThatThrownBy(() -> service.download(key))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(s3, never()).getObjectAsBytes(any(GetObjectRequest.class));
    }
}

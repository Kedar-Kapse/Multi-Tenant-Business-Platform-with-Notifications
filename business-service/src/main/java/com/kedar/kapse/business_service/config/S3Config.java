package com.kedar.kapse.business_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Credentials come from the AWS SDK's default chain (AWS_ACCESS_KEY_ID /
 * AWS_SECRET_ACCESS_KEY env vars locally, an IAM role on AWS), so no keys
 * live in code or config. They are only resolved on the first S3 call, which
 * keeps app startup (and contextLoads tests) independent of AWS.
 */
@Configuration
public class S3Config {

    @Bean
    public S3Client s3Client(@Value("${aws.region}") String region) {
        return S3Client.builder()
                .region(Region.of(region))
                .httpClient(UrlConnectionHttpClient.create())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner(@Value("${aws.region}") String region) {
        return S3Presigner.builder().region(Region.of(region)).build();
    }
}

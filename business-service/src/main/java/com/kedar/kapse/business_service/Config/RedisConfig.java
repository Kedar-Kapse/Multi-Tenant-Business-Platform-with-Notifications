package com.kedar.kapse.business_service.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    // RedisTemplate is used to perform Redis operations (SET, GET, DELETE)
    // Spring Boot auto-configures LettuceConnectionFactory from spring.data.redis.* properties
    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory factory) {

        RedisTemplate<String, String> template = new RedisTemplate<>();

        // Set Redis connection (auto-configured by Spring Boot)
        template.setConnectionFactory(factory);

        // Key serializer (human-readable keys)
        template.setKeySerializer(new StringRedisSerializer());

        // Value serializer (string values)
        template.setValueSerializer(new StringRedisSerializer());

        return template;
    }
}

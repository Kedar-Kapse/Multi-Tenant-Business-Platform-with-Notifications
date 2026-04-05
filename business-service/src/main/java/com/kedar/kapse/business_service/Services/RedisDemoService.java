package com.kedar.kapse.business_service.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisDemoService {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;  // Inject RedisTemplate

    public void saveValue(String key, String value){
        redisTemplate.opsForValue().set(key, value);  // Save key-value in Redis
    }

    public String getValue(String key){
        return redisTemplate.opsForValue().get(key);   // Read value from Redis
    }
}

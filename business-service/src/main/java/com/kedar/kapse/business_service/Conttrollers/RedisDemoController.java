package com.kedar.kapse.business_service.Conttrollers;

import com.kedar.kapse.business_service.Services.RedisDemoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/redis")
public class RedisDemoController {

    @Autowired
    private RedisDemoService service;

    @GetMapping("/set")
    public String setValue(@RequestParam String key, @RequestParam String value){
        service.saveValue(key, value);
        return "Saved key=" + key + ", value=" + value;
    }

    @GetMapping("/get")
    public String getValue(@RequestParam String key){
        return service.getValue(key);
    }


}

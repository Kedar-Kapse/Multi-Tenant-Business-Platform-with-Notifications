package com.kedar.kapse.business_service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kedar.kapse.business_service.Practice.TestRequest;
import com.kedar.kapse.business_service.Practice.TestService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TestController.class)
public class TestController {


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestService testService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testAddDataSuccess() throws Exception{
        TestRequest request =  new TestRequest();

    }
}

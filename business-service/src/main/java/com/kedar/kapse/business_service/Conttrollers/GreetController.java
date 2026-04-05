package com.kedar.kapse.business_service.Conttrollers;

import com.kedar.kapse.business_service.client.DemoApiClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/business-service")
public class GreetController {

    @Autowired
    private DemoApiClient demoApiClient;

    @GetMapping("/getMessage")
    public String getGreetMessage() {
        String greetMessage = "This is Greet Message From Business-Service....";
        String welcomeMessage = demoApiClient.invokeAccessSecurityServiceWelcomeMessage();
        return greetMessage + welcomeMessage;
    }
}


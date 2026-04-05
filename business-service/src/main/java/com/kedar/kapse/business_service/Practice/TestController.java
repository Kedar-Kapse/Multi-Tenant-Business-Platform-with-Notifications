package com.kedar.kapse.business_service.Practice;

import org.apache.kafka.common.Uuid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RequestMapping("/api/business-service/test")
@RestController
public class TestController {


   private final TestService testService;

   public TestController(TestService testService){
       this.testService = testService;
   }

    @PostMapping("/addData")
    public ResponseEntity<String> addData(@RequestBody TestRequest testRequest){
       return ResponseEntity.status(HttpStatus.CREATED).body(testService.addUser(testRequest));
    }

    @GetMapping("/getAlerts/{patientId}")
    public ResponseEntity<List<AlertResponse>> getAlerts(@PathVariable Uuid patientId){
       return ResponseEntity.ok(testService.getAlerts(patientId));
    }

    @PutMapping("/updateAlert/{patientId}")
    public ResponseEntity<String> updateAlert(@PathVariable UUID patientId , @RequestBody TestRequest testRequest){
       return ResponseEntity.status(HttpStatus.OK).body(testService.updateAlert(patientId , testRequest));
    }

    @DeleteMapping("/deleteAlert/{alertId}")
    public ResponseEntity<String> deleteById(@PathVariable UUID alertId){
       return ResponseEntity.ok(testService.deleteById(alertId));
    }
}

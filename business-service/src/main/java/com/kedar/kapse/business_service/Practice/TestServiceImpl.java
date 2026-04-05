package com.kedar.kapse.business_service.Practice;
import com.kedar.kapse.platform_core.entity.User;
import jakarta.persistence.Id;
import org.apache.kafka.common.Uuid;
import org.aspectj.weaver.ast.Test;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Stream;

@Service
public class TestServiceImpl implements TestService {

    private final TestRepo testRepo;
    private final TaskRepo taskRepo;
    public TestServiceImpl(TestRepo testRepo , TaskRepo taskRepo){
        this.testRepo = testRepo;
        this.taskRepo = taskRepo;
    }

    @Override
    public String addUser(TestRequest testRequest){
        TestEntity testEntity = new TestEntity();
        testEntity.setId(UUID.randomUUID());
        testEntity.setFirstName(testRequest.getFirstName());
        testEntity.setLastName(testRequest.getLastName());
        testEntity.setCity(testRequest.getCity());
        testEntity.setState(testRequest.getState());
        testRepo.save(testEntity);
        return "Success";
    }

    @Override
    public List<AlertResponse> getAlerts(Uuid patientId){
        Optional<TaskTest> tasks = taskRepo.findById(patientId);
        Stream<TaskTest> alerts  = tasks.stream().filter(taskTest -> taskTest.getTherapistId()!=null);
        return tasks.stream()
                .filter(task -> task.getTherapistId() != null)
                .map(AlertResponse::new)
                .toList();
    }

    @Override
    public String updateAlert(UUID PatientId , TestRequest testRequest){
        Optional<TestEntity> testEntity = testRepo.findById(PatientId);

        if(testEntity.isEmpty()){
            throw new RuntimeException("User not found");
        }

        TestEntity test = testEntity.get();
        test.setFirstName(testRequest.getFirstName());
        test.setLastName(testRequest.getLastName());
        test.setCity(testRequest.getCity());
        test.setState(testRequest.getState());
        testRepo.save(test);
        return "Updated SuccessFully";
    }

    public String deleteById(UUID alertId){
        Optional<TestEntity> testEntity  = testRepo.findById(alertId);
        if (testEntity.isEmpty()){
            throw new RuntimeException("Alert is not available");
        }
        testRepo.deleteById(alertId);
        return "Alert deleted Successfully";
    }
}

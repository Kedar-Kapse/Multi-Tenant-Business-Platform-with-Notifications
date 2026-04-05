package com.kedar.kapse.business_service.Practice;


import org.apache.kafka.common.Uuid;

import java.util.List;
import java.util.UUID;

public interface TestService {

    public String addUser(TestRequest testRequest);

    public List<AlertResponse> getAlerts(Uuid patientId);

    public String updateAlert(UUID patientId , TestRequest testRequest);

    String deleteById(UUID alertId);
}

package com.kedar.kapse.business_service.Practice;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class TaskTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String taskName;
    private int duration;
    private String therapistId;
    private String patientId;
}

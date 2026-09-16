package com.kedar.kapse.business_service.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class PracticeDtoBank {

    UUID senderId;
    UUID receiverId;
    BigDecimal amount;

}

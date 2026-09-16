package com.kedar.kapse.business_service.Response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class PracticeBankResponse {

    private String message;

    private BigDecimal reminingBalance;
}

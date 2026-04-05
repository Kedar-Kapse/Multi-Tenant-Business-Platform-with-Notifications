package com.kedar.kapse.business_service.MonoFluxEx;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CustomerEvent {

    private String name;
    private Date createDate;

}

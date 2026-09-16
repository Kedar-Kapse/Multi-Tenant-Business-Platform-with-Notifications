package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.Response.PracticeBankResponse;
import com.kedar.kapse.business_service.dto.PracticeDtoBank;
import com.kedar.kapse.business_service.service.PracticeBankService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RequestMapping("/api/practice/acid")
@RestController
public class PracticeAcidController {


    private PracticeBankService practiceBankService;

    public PracticeAcidController(PracticeBankService practiceBankService){
        this.practiceBankService = practiceBankService;
    }

    @PostMapping("/transfer-money")
    public PracticeBankResponse transferMoney(@RequestBody PracticeDtoBank practiceDtoBank){
        return practiceBankService.transferMoney(practiceDtoBank);
    }

    // Consistency demo — try sending more money than Alice has
    @PostMapping("/transfer-money-consistency")
    public PracticeBankResponse transferMoneyConsistency(@RequestBody PracticeDtoBank practiceDtoBank){
        return practiceBankService.transferMoneyConsistency(practiceDtoBank);
    }

    // Isolation demo — hit this twice in parallel to see the race condition
    @PostMapping("/transfer-money-isolation")
    public PracticeBankResponse transferMoneyIsolation(@RequestBody PracticeDtoBank practiceDtoBank){
        return practiceBankService.transferMoneyIsolation(practiceDtoBank);
    }

}

package com.kedar.kapse.business_service.service;

import com.kedar.kapse.business_service.Response.PracticeBankResponse;
import com.kedar.kapse.business_service.dto.PracticeDtoBank;



public interface PracticeBankService {

     PracticeBankResponse transferMoney(PracticeDtoBank practiceDtoBank);

     PracticeBankResponse transferMoneyConsistency(PracticeDtoBank practiceDtoBank);

     PracticeBankResponse transferMoneyIsolation(PracticeDtoBank practiceDtoBank);

}

package com.kedar.kapse.business_service.service.Impl;

import com.kedar.kapse.business_service.Response.PracticeBankResponse;
import com.kedar.kapse.business_service.dto.PracticeDtoBank;
import com.kedar.kapse.business_service.entity.PracticeBankTransfer;
import com.kedar.kapse.business_service.repository.PracticeBankRepo;
import com.kedar.kapse.business_service.service.PracticeBankService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

@Service
public class PracticeBankServiceImpl implements PracticeBankService {


    private PracticeBankRepo practiceBankRepo;

    public PracticeBankServiceImpl(PracticeBankRepo practiceBankRepo){
        this.practiceBankRepo = practiceBankRepo;
    }


    @Override
    @Transactional
    public PracticeBankResponse transferMoney(PracticeDtoBank practiceDtoBank) {


        PracticeBankTransfer receiver = practiceBankRepo.findByUuid(practiceDtoBank.getReceiverId()).orElseThrow(()-> new RuntimeException("receiver not found"));
        PracticeBankTransfer sender = practiceBankRepo.findByUuid(practiceDtoBank.getSenderId()).orElseThrow(()-> new RuntimeException("sender not found"));
        if(practiceDtoBank.getAmount()==null){
            throw new RuntimeException("Amount is missing");
        }

        // STEP 1: credit the receiver
        receiver.setAmount(receiver.getAmount().add(practiceDtoBank.getAmount()));
        practiceBankRepo.save(receiver);

        // 💥 simulated crash — DB connection drops, server killed, etc.
        if (true) throw new RuntimeException("simulated crash — DB connection lost!");

        // STEP 2: debit the sender (never runs because of the crash above)
        sender.setAmount(sender.getAmount().subtract(practiceDtoBank.getAmount()));
        practiceBankRepo.save(sender);

        PracticeBankResponse response =
                new PracticeBankResponse();

        response.setMessage("Money transferred successfully");
        response.setReminingBalance(sender.getAmount());
        return response;

    }


    // =========================================================================
    // ACID — Part I: ISOLATION demo (WITHOUT locking — race condition!)
    // =========================================================================
    // We READ both accounts, then SLEEP 3 seconds (simulating any slow work
    // — external API call, PDF generation, etc.), then WRITE.
    //
    // Hit this endpoint TWICE in parallel with amount=800. Both calls read
    // Alice's balance as 1000 (because neither has committed yet). Both pass
    // the consistency check. Both deduct 800 from "their view" of 1000.
    // Result: one transfer is silently LOST. Bob receives only +800 instead
    // of +1600 — even though both API calls return "success".
    // =========================================================================
    @Override
    @Transactional
    public PracticeBankResponse transferMoneyIsolation(PracticeDtoBank practiceDtoBank) {

        // 🔒 Locked reads — second concurrent call will WAIT here until the first commits
        PracticeBankTransfer sender = practiceBankRepo.findByUuidForUpdate(practiceDtoBank.getSenderId())
                .orElseThrow(() -> new RuntimeException("sender not found"));
        PracticeBankTransfer receiver = practiceBankRepo.findByUuidForUpdate(practiceDtoBank.getReceiverId())
                .orElseThrow(() -> new RuntimeException("receiver not found"));

        if (practiceDtoBank.getAmount() == null) {
            throw new RuntimeException("Amount is missing");
        }

        if (sender.getAmount().compareTo(practiceDtoBank.getAmount()) < 0) {
            throw new RuntimeException("Insufficient balance — "
                    + sender.getHolderName() + " has " + sender.getAmount()
                    + " but tried to send " + practiceDtoBank.getAmount());
        }

        // 🐢 Simulate slow work between READ and WRITE — this is where the race lives
        System.out.println("Thread " + Thread.currentThread().getName()
                + " — read " + sender.getHolderName() + "=" + sender.getAmount()
                + ", now sleeping 3s...");
        try { Thread.sleep(3000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }

        sender.setAmount(sender.getAmount().subtract(practiceDtoBank.getAmount()));
        receiver.setAmount(receiver.getAmount().add(practiceDtoBank.getAmount()));

        practiceBankRepo.save(receiver);
        practiceBankRepo.save(sender);

        PracticeBankResponse response = new PracticeBankResponse();
        response.setMessage("Money transferred successfully");
        response.setReminingBalance(sender.getAmount());
        return response;
    }


    // =========================================================================
    // ACID — Part C: CONSISTENCY demo
    // =========================================================================
    // No "balance >= 0" rule here on purpose.
    // Try transferring 1500 from Alice (who has 1000) → Alice goes NEGATIVE.
    // That's a consistency violation, even though @Transactional commits atomically.
    // =========================================================================
    @Override
    @Transactional
    public PracticeBankResponse transferMoneyConsistency(PracticeDtoBank practiceDtoBank) {

        PracticeBankTransfer receiver = practiceBankRepo.findByUuid(practiceDtoBank.getReceiverId())
                .orElseThrow(() -> new RuntimeException("receiver not found"));
        PracticeBankTransfer sender = practiceBankRepo.findByUuid(practiceDtoBank.getSenderId())
                .orElseThrow(() -> new RuntimeException("sender not found"));

        if (practiceDtoBank.getAmount() == null) {
            throw new RuntimeException("Amount is missing");
        }

        // ✅ CONSISTENCY RULE: sender must have enough balance
        if (sender.getAmount().compareTo(practiceDtoBank.getAmount()) < 0) {
            throw new RuntimeException("Insufficient balance — "
                    + sender.getHolderName() + " has " + sender.getAmount()
                    + " but tried to send " + practiceDtoBank.getAmount());
        }

        sender.setAmount(sender.getAmount().subtract(practiceDtoBank.getAmount()));
        receiver.setAmount(receiver.getAmount().add(practiceDtoBank.getAmount()));

        practiceBankRepo.save(receiver);
        practiceBankRepo.save(sender);

        PracticeBankResponse response = new PracticeBankResponse();
        response.setMessage("Money transferred successfully");
        response.setReminingBalance(sender.getAmount());
        return response;
    }
}

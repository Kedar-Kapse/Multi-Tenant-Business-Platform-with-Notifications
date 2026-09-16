package com.kedar.kapse.business_service.config;

import com.kedar.kapse.business_service.entity.PracticeBankTransfer;
import com.kedar.kapse.business_service.repository.PracticeBankRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Component @RequiredArgsConstructor @Slf4j @Order(50)
public class PracticeBankAccountSeeder implements CommandLineRunner {

    public static final UUID ALICE_UUID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    public static final UUID BOB_UUID   = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private final PracticeBankRepo repo;

    @Override
    public void run(String... args) {
        if (repo.count() > 0) {
            log.info("Practice bank accounts already seeded");
            return;
        }
        repo.saveAll(List.of(
            PracticeBankTransfer.builder()
                .id(ALICE_UUID).holderName("Alice").amount(new BigDecimal("1000.00")).build(),
            PracticeBankTransfer.builder()
                .id(BOB_UUID).holderName("Bob").amount(new BigDecimal("500.00")).build()
        ));
        log.info("Seeded 2 practice bank accounts: Alice={} (1000), Bob={} (500)", ALICE_UUID, BOB_UUID);
    }
}

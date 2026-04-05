package com.kedar.kapse.business_service.Conttrollers;

import com.kedar.kapse.business_service.MonoFluxEx.CustomerEvent;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.function.Tuple2;

import java.time.Duration;
import java.util.Date;
import java.util.stream.Stream;

@RestController
public class MonoFluxExampleController {


    @GetMapping("/getEvent")
    public ResponseEntity<Mono<CustomerEvent>> getEvent(){
        CustomerEvent customerEvent = new CustomerEvent("Kedar" , new Date());
        Mono<CustomerEvent> customerEventMono = Mono.just(customerEvent);
        return new ResponseEntity<Mono<CustomerEvent>>(customerEventMono , HttpStatus.OK);

    }

    @GetMapping(value = "/getMono" , produces = "application/json")
    public Mono<CustomerEvent> getMono(){
        CustomerEvent customerEvent = new CustomerEvent("Kedar" , new Date());
        return Mono.just(customerEvent);
    }

    @GetMapping(value = "/getEvents" , produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<Flux<CustomerEvent>> getEvents(){
        CustomerEvent event = new CustomerEvent("Kedar..." ,new Date());
        Stream<CustomerEvent> customerEventStream = Stream.generate(()-> event);
        Flux<CustomerEvent> cflux = Flux.fromStream(customerEventStream);
        Flux<Long> intervalFlux = Flux.interval(Duration.ofSeconds(2));
        Flux<Tuple2<Long , CustomerEvent>> zip =  Flux.zip(intervalFlux , cflux);
        Flux<CustomerEvent> fluxMap = zip.map(Tuple2::getT2);
        return new ResponseEntity<>(fluxMap , HttpStatus.OK);

    }


}

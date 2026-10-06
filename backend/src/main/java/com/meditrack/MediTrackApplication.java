package com.meditrack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MediTrackApplication {
    public static void main(String[] args) {
        SpringApplication.run(MediTrackApplication.class, args);
    }
}

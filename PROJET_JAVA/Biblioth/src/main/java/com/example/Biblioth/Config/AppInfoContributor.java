package com.example.Biblioth.Config;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.info.Info;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.stereotype.Component;

@Component
public class AppInfoContributor implements InfoContributor {
    private final String activeProfile;

    public AppInfoContributor(@Value("${spring.profiles.active:dev}") String activeProfile) {
        this.activeProfile = activeProfile;
    }

    @Override
    public void contribute(Info.Builder builder) {
        builder.withDetail("application", Map.of(
                "name", "Biblioth",
                "version", "1.0.0",
                "environment", activeProfile
        ));
    }
}

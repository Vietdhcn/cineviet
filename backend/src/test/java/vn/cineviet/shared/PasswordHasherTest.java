package vn.cineviet.shared;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordHasherTest {
    @Test
    void hashesUseRandomSaltAndVerifyOnlyTheCorrectPassword() {
        var first = PasswordHasher.hash("correct horse battery staple");
        var second = PasswordHasher.hash("correct horse battery staple");
        assertThat(first).startsWith("pbkdf2-sha256$600000$").isNotEqualTo(second);
        assertThat(PasswordHasher.matches("correct horse battery staple", first)).isTrue();
        assertThat(PasswordHasher.matches("wrong password", first)).isFalse();
    }

    @Test
    void rejectsDemoAndMalformedHashes() {
        assertThat(PasswordHasher.matches("anything", "SESSION-DEMO-NO-PASSWORD")).isFalse();
        assertThat(PasswordHasher.matches("anything", "pbkdf2-sha256$999999999$bad$bad")).isFalse();
        assertThat(PasswordHasher.matches("anything", null)).isFalse();
    }
}

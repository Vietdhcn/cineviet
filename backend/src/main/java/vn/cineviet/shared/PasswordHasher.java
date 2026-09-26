package vn.cineviet.shared;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/** Versioned password hashes so the work factor can be raised without resetting accounts. */
public final class PasswordHasher {
    private static final int ITERATIONS = 600_000;
    private static final int SALT_BYTES = 16;
    private static final int HASH_BITS = 256;
    private static final String PREFIX = "pbkdf2-sha256";
    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordHasher() {}

    public static String hash(String password) {
        var salt = new byte[SALT_BYTES];
        RANDOM.nextBytes(salt);
        return PREFIX + "$" + ITERATIONS + "$" + Base64.getEncoder().encodeToString(salt) + "$"
            + Base64.getEncoder().encodeToString(derive(password, salt, ITERATIONS));
    }

    public static boolean matches(String password, String stored) {
        if (stored == null) return false;
        var parts = stored.split("\\$", -1);
        if (parts.length != 4 || !PREFIX.equals(parts[0])) return false;
        try {
            var iterations = Integer.parseInt(parts[1]);
            if (iterations < 100_000 || iterations > 2_000_000) return false;
            var salt = Base64.getDecoder().decode(parts[2]);
            var expected = Base64.getDecoder().decode(parts[3]);
            if (salt.length != SALT_BYTES || expected.length != HASH_BITS / 8) return false;
            return MessageDigest.isEqual(expected, derive(password, salt, iterations));
        } catch (IllegalArgumentException error) {
            return false;
        }
    }

    private static byte[] derive(String password, byte[] salt, int iterations) {
        var chars = password.toCharArray();
        var spec = new PBEKeySpec(chars, salt, iterations, HASH_BITS);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (Exception error) {
            throw new IllegalStateException("PBKDF2 unavailable", error);
        } finally {
            spec.clearPassword();
            Arrays.fill(chars, '\0');
        }
    }
}

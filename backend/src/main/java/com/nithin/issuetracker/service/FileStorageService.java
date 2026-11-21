package com.nithin.issuetracker.service;

import com.nithin.issuetracker.exception.BadRequestException;
import com.nithin.issuetracker.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

/**
 * Stores screenshots on local disk. Files are saved under a random UUID name (the user's file name is
 * never used as a path) and only real PNG/JPEG/GIF/WebP images are accepted (content type AND magic bytes).
 * For cloud deployments with ephemeral disks, point app.upload-dir at a mounted volume or swap this class
 * for an S3 implementation.
 */
@Service
public class FileStorageService {

    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "image/png", ".png",
            "image/jpeg", ".jpg",
            "image/gif", ".gif",
            "image/webp", ".webp");

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir) throws IOException {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    /** Saves the file and returns the generated stored name. */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        String extension = ALLOWED_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new BadRequestException("Only PNG, JPEG, GIF and WebP images are allowed");
        }
        String storedName = UUID.randomUUID() + extension;
        try {
            byte[] head = new byte[12];
            int read;
            try (InputStream in = file.getInputStream()) {
                read = in.readNBytes(head, 0, head.length);
            }
            if (!matchesMagicBytes(file.getContentType(), Arrays.copyOf(head, read))) {
                throw new BadRequestException("File content does not match its image type");
            }
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, root.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Could not store file", e);
        }
        return storedName;
    }

    public Resource load(String storedName) {
        Path path = root.resolve(storedName).normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) {
            throw new ResourceNotFoundException("File not found on server");
        }
        return new FileSystemResource(path);
    }

    public void deleteQuietly(String storedName) {
        try {
            Path path = root.resolve(storedName).normalize();
            if (path.startsWith(root)) {
                Files.deleteIfExists(path);
            }
        } catch (IOException ignored) {
            // best effort
        }
    }

    private static boolean matchesMagicBytes(String contentType, byte[] h) {
        switch (contentType) {
            case "image/png":
                return h.length >= 4 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G';
            case "image/jpeg":
                return h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF;
            case "image/gif":
                return h.length >= 4 && new String(h, 0, 4, StandardCharsets.US_ASCII).equals("GIF8");
            case "image/webp":
                return h.length >= 12
                        && new String(h, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                        && new String(h, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
            default:
                return false;
        }
    }
}

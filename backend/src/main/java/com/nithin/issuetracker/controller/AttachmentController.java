package com.nithin.issuetracker.controller;

import com.nithin.issuetracker.dto.Dtos.AttachmentDto;
import com.nithin.issuetracker.security.AppUserDetails;
import com.nithin.issuetracker.service.AttachmentService;
import com.nithin.issuetracker.service.AttachmentService.DownloadedFile;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @GetMapping("/tickets/{ticketId}/attachments")
    public List<AttachmentDto> list(@PathVariable Long ticketId, @AuthenticationPrincipal AppUserDetails me) {
        return attachmentService.list(ticketId, me);
    }

    /** multipart/form-data with a single part named "file" (PNG, JPEG, GIF or WebP, max 5MB). */
    @PostMapping(value = "/tickets/{ticketId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AttachmentDto upload(@PathVariable Long ticketId, @RequestParam("file") MultipartFile file,
                                @AuthenticationPrincipal AppUserDetails me) {
        return attachmentService.upload(ticketId, file, me);
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long attachmentId, @AuthenticationPrincipal AppUserDetails me) {
        DownloadedFile file = attachmentService.download(attachmentId, me);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .body(file.resource());
    }

    @DeleteMapping("/attachments/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long attachmentId, @AuthenticationPrincipal AppUserDetails me) {
        attachmentService.delete(attachmentId, me);
    }
}

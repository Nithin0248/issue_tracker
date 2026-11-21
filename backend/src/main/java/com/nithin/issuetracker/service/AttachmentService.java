package com.nithin.issuetracker.service;

import com.nithin.issuetracker.dto.Dtos.AttachmentDto;
import com.nithin.issuetracker.dto.Mapper;
import com.nithin.issuetracker.entity.Attachment;
import com.nithin.issuetracker.entity.Ticket;
import com.nithin.issuetracker.event.ProjectEvent;
import com.nithin.issuetracker.exception.ForbiddenException;
import com.nithin.issuetracker.exception.ResourceNotFoundException;
import com.nithin.issuetracker.repository.AttachmentRepository;
import com.nithin.issuetracker.repository.TicketRepository;
import com.nithin.issuetracker.repository.UserRepository;
import com.nithin.issuetracker.security.AppUserDetails;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class AttachmentService {

    /** What the controller needs to stream a file back; built inside the transaction. */
    public record DownloadedFile(String fileName, String contentType, Resource resource) {
    }

    private final AttachmentRepository attachmentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final AccessService access;
    private final FileStorageService storage;
    private final ApplicationEventPublisher events;

    public AttachmentService(AttachmentRepository attachmentRepository, TicketRepository ticketRepository,
                             UserRepository userRepository, AccessService access,
                             FileStorageService storage, ApplicationEventPublisher events) {
        this.attachmentRepository = attachmentRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.access = access;
        this.storage = storage;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<AttachmentDto> list(Long ticketId, AppUserDetails actor) {
        Ticket t = findTicket(ticketId);
        access.requireView(t.getProject().getId(), actor);
        return attachmentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId).stream().map(Mapper::attachment).toList();
    }

    @Transactional
    public AttachmentDto upload(Long ticketId, MultipartFile file, AppUserDetails actor) {
        Ticket t = findTicket(ticketId);
        Long projectId = t.getProject().getId();
        access.requireView(projectId, actor);

        String storedName = storage.store(file);
        try {
            Attachment a = new Attachment();
            a.setTicket(t);
            a.setUploader(userRepository.findById(actor.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found")));
            a.setFileName(displayName(file.getOriginalFilename()));
            a.setStoredName(storedName);
            a.setContentType(file.getContentType());
            a.setSize(file.getSize());
            attachmentRepository.save(a);

            events.publishEvent(new ProjectEvent(projectId, "ATTACHMENT_ADDED", ticketId, actor.getId()));
            return Mapper.attachment(a);
        } catch (RuntimeException e) {
            storage.deleteQuietly(storedName); // don't leave an orphan file behind
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public DownloadedFile download(Long attachmentId, AppUserDetails actor) {
        Attachment a = findAttachment(attachmentId);
        access.requireView(a.getTicket().getProject().getId(), actor);
        return new DownloadedFile(a.getFileName(), a.getContentType(), storage.load(a.getStoredName()));
    }

    @Transactional
    public void delete(Long attachmentId, AppUserDetails actor) {
        Attachment a = findAttachment(attachmentId);
        Long projectId = a.getTicket().getProject().getId();
        AccessService.ProjectAccess access = this.access.requireView(projectId, actor);
        boolean isUploader = a.getUploader().getId().equals(actor.getId());
        if (!isUploader && !access.canManage()) {
            throw new ForbiddenException("Only the uploader, project managers or admins can delete this file");
        }
        String storedName = a.getStoredName();
        Long ticketId = a.getTicket().getId();
        attachmentRepository.delete(a);
        attachmentRepository.flush();
        storage.deleteQuietly(storedName);

        events.publishEvent(new ProjectEvent(projectId, "ATTACHMENT_DELETED", ticketId, actor.getId()));
    }

    private Ticket findTicket(Long id) {
        return ticketRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
    }

    private Attachment findAttachment(Long id) {
        return attachmentRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
    }

    /** Strip any directory part from the client's file name and cap its length. */
    private static String displayName(String original) {
        String name = original == null ? null : StringUtils.getFilename(StringUtils.cleanPath(original));
        if (name == null || name.isBlank()) {
            return "screenshot";
        }
        return name.length() > 255 ? name.substring(0, 255) : name;
    }
}

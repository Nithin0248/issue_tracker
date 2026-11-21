package com.nithin.issuetracker.controller;

import com.nithin.issuetracker.dto.Dtos.CommentDto;
import com.nithin.issuetracker.dto.Dtos.CommentRequest;
import com.nithin.issuetracker.security.AppUserDetails;
import com.nithin.issuetracker.service.CommentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/tickets/{ticketId}/comments")
    public List<CommentDto> list(@PathVariable Long ticketId, @AuthenticationPrincipal AppUserDetails me) {
        return commentService.list(ticketId, me);
    }

    @PostMapping("/tickets/{ticketId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto add(@PathVariable Long ticketId, @Valid @RequestBody CommentRequest req,
                          @AuthenticationPrincipal AppUserDetails me) {
        return commentService.add(ticketId, req, me);
    }

    @PutMapping("/comments/{commentId}")
    public CommentDto update(@PathVariable Long commentId, @Valid @RequestBody CommentRequest req,
                             @AuthenticationPrincipal AppUserDetails me) {
        return commentService.update(commentId, req, me);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long commentId, @AuthenticationPrincipal AppUserDetails me) {
        commentService.delete(commentId, me);
    }
}

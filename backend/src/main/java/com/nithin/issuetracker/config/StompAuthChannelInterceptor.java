package com.nithin.issuetracker.config;

import com.nithin.issuetracker.security.AppUserDetails;
import com.nithin.issuetracker.security.AppUserDetailsService;
import com.nithin.issuetracker.security.JwtService;
import com.nithin.issuetracker.service.AccessService;
import io.jsonwebtoken.JwtException;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Secures the WebSocket (STOMP) channel:
 *  - CONNECT must carry "Authorization: Bearer <jwt>"
 *  - SUBSCRIBE is only allowed to /topic/projects/{id} of projects the user can view
 *  - SEND is rejected: all events are published by the server, never by clients
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern PROJECT_TOPIC = Pattern.compile("^/topic/projects/(\\d+)$");

    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;
    private final AccessService accessService;

    public StompAuthChannelInterceptor(JwtService jwtService, AppUserDetailsService userDetailsService,
                                       AccessService accessService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.accessService = accessService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            authenticate(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            authorizeSubscription(accessor);
        } else if (StompCommand.SEND.equals(command)) {
            throw new MessagingException("Clients may not publish messages");
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessagingException("Missing Authorization header");
        }
        try {
            String email = jwtService.extractEmail(header.substring(7));
            UserDetails user = userDetailsService.loadUserByUsername(email);
            if (!user.isEnabled()) {
                throw new MessagingException("Account disabled");
            }
            accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException e) {
            throw new MessagingException("Invalid or expired token");
        }
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (!(principal instanceof Authentication)
                || !(((Authentication) principal).getPrincipal() instanceof AppUserDetails)) {
            throw new MessagingException("Not authenticated");
        }
        AppUserDetails user = (AppUserDetails) ((Authentication) principal).getPrincipal();

        String destination = accessor.getDestination();
        Matcher m = PROJECT_TOPIC.matcher(destination == null ? "" : destination);
        if (!m.matches()) {
            throw new MessagingException("Subscription not allowed");
        }
        Long projectId = Long.valueOf(m.group(1));
        if (!accessService.access(projectId, user).canView()) {
            throw new MessagingException("You are not a member of this project");
        }
    }
}

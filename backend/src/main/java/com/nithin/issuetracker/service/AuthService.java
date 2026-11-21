package com.nithin.issuetracker.service;

import com.nithin.issuetracker.dto.Dtos.AuthResponse;
import com.nithin.issuetracker.dto.Dtos.LoginRequest;
import com.nithin.issuetracker.dto.Dtos.RegisterRequest;
import com.nithin.issuetracker.dto.Mapper;
import com.nithin.issuetracker.entity.User;
import com.nithin.issuetracker.enums.Role;
import com.nithin.issuetracker.exception.ConflictException;
import com.nithin.issuetracker.repository.UserRepository;
import com.nithin.issuetracker.security.AppUserDetails;
import com.nithin.issuetracker.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /** The very first account becomes ADMIN (bootstrap); everyone after that is a DEVELOPER until an admin changes it. */
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists");
        }
        Role role = userRepository.count() == 0 ? Role.ADMIN : Role.DEVELOPER;
        User user = userRepository.save(new User(req.name().trim(), email, passwordEncoder.encode(req.password()), role));
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email().trim().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        if (!user.isActive() || !passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }
        return toResponse(user);
    }

    private AuthResponse toResponse(User user) {
        String token = jwtService.generateToken(AppUserDetails.from(user));
        return new AuthResponse(token, "Bearer", Mapper.user(user));
    }
}

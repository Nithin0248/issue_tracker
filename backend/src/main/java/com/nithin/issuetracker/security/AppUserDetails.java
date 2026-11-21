package com.nithin.issuetracker.security;

import com.nithin.issuetracker.entity.User;
import com.nithin.issuetracker.enums.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/** The authenticated principal. Controllers receive it via @AuthenticationPrincipal. */
public class AppUserDetails implements UserDetails {

    private final Long id;
    private final String name;
    private final String email;
    private final String password;
    private final Role role;
    private final boolean active;

    public AppUserDetails(Long id, String name, String email, String password, Role role, boolean active) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role;
        this.active = active;
    }

    public static AppUserDetails from(User u) {
        return new AppUserDetails(u.getId(), u.getName(), u.getEmail(), u.getPassword(), u.getRole(), u.isActive());
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public Role getRole() { return role; }
    public boolean isAdmin() { return role == Role.ADMIN; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() { return password; }

    /** The "username" is the email address. */
    @Override
    public String getUsername() { return email; }

    @Override
    public boolean isEnabled() { return active; }
}

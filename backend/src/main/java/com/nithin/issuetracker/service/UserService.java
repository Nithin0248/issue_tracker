package com.nithin.issuetracker.service;

import com.nithin.issuetracker.dto.Dtos.UserDto;
import com.nithin.issuetracker.dto.Mapper;
import com.nithin.issuetracker.entity.User;
import com.nithin.issuetracker.enums.Role;
import com.nithin.issuetracker.exception.BadRequestException;
import com.nithin.issuetracker.exception.ResourceNotFoundException;
import com.nithin.issuetracker.repository.UserRepository;
import com.nithin.issuetracker.security.AppUserDetails;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserDto me(AppUserDetails actor) {
        return Mapper.user(find(actor.getId()));
    }

    /** Lookup used by the "add member" and "assign" pickers. Returns at most 20 matches. */
    @Transactional(readOnly = true)
    public List<UserDto> search(String q) {
        String term = q == null ? "" : q.trim();
        return userRepository
                .findTop20ByNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByNameAsc(term, term)
                .stream().map(Mapper::user).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDto> listAll() {
        return userRepository.findAll(Sort.by("name")).stream().map(Mapper::user).toList();
    }

    @Transactional
    public UserDto changeRole(Long userId, Role role, AppUserDetails actor) {
        if (userId.equals(actor.getId())) {
            throw new BadRequestException("You cannot change your own role");
        }
        User user = find(userId);
        user.setRole(role);
        return Mapper.user(user);
    }

    private User find(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}

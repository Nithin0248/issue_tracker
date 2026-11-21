package com.nithin.issuetracker;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end API flow against an in-memory H2 database: auth, roles, projects, members,
 * tickets, Kanban move, comments, search and permission checks.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class IssueTrackerApiTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper om;

    @Test
    void fullWorkflow() throws Exception {
        // --- auth: first user becomes ADMIN, later users are DEVELOPERs ---
        String adminToken = register("Alice Admin", "alice@test.com");
        String devToken = register("Dave Dev", "dave@test.com");
        String outsiderToken = register("Olga Outsider", "olga@test.com");

        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + devToken))
                .andExpect(jsonPath("$.role").value("DEVELOPER"));

        // wrong password -> 401, no token -> 401
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "alice@test.com", "password", "wrong-password"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());

        // --- projects: developers cannot create, admins can ---
        mvc.perform(post("/api/projects").header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Nope", "key", "NOPE"))))
                .andExpect(status().isForbidden());

        String projectBody = mvc.perform(post("/api/projects").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Test Project", "key", "tst", "description", "desc"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("TST"))
                .andReturn().getResponse().getContentAsString();
        long projectId = ((Number) JsonPath.read(projectBody, "$.id")).longValue();

        // duplicate key -> 409
        mvc.perform(post("/api/projects").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Dup", "key", "TST"))))
                .andExpect(status().isConflict());

        // --- members ---
        mvc.perform(post("/api/projects/" + projectId + "/members").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "dave@test.com", "projectRole", "DEVELOPER"))))
                .andExpect(status().isCreated());

        // non-member cannot see the project's tickets
        mvc.perform(get("/api/projects/" + projectId + "/tickets").header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());

        // --- tickets ---
        String ticketBody = mvc.perform(post("/api/projects/" + projectId + "/tickets")
                        .header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Login crash on empty password", "description", "500 error",
                                "type", "BUG", "priority", "HIGH"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("TST-1"))
                .andExpect(jsonPath("$.status").value("TODO"))
                .andReturn().getResponse().getContentAsString();
        long ticketId = ((Number) JsonPath.read(ticketBody, "$.id")).longValue();

        // second ticket gets number 2
        mvc.perform(post("/api/projects/" + projectId + "/tickets").header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Update docs"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("TST-2"));

        // validation error -> 400 with field errors
        mvc.perform(post("/api/projects/" + projectId + "/tickets").header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", ""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").exists());

        // assignee must be a project member
        mvc.perform(patch("/api/tickets/" + ticketId + "/assignee").header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"assigneeId\": 999999}"))
                .andExpect(status().isBadRequest());

        // --- Kanban move ---
        mvc.perform(patch("/api/tickets/" + ticketId + "/status").header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("status", "IN_PROGRESS"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mvc.perform(get("/api/projects/" + projectId + "/board").header("Authorization", "Bearer " + devToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todo.length()").value(1))
                .andExpect(jsonPath("$.inProgress.length()").value(1))
                .andExpect(jsonPath("$.done.length()").value(0));

        // --- comments ---
        mvc.perform(post("/api/tickets/" + ticketId + "/comments").header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("text", "Reproduced on staging"))))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/tickets/" + ticketId + "/comments").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].text").value("Reproduced on staging"));

        // --- search & filters ---
        search(projectId, devToken, "?q=crash").andExpect(jsonPath("$.totalElements").value(1));
        search(projectId, devToken, "?q=TST-2").andExpect(jsonPath("$.totalElements").value(1));
        search(projectId, devToken, "?status=DONE").andExpect(jsonPath("$.totalElements").value(0));
        search(projectId, devToken, "?priority=HIGH&type=BUG").andExpect(jsonPath("$.totalElements").value(1));
        search(projectId, devToken, "?sort=password,asc").andExpect(status().isBadRequest());

        // --- delete: a different developer who is not the reporter cannot delete; the reporter can ---
        String dev2Token = register("Eve Dev", "eve@test.com");
        mvc.perform(post("/api/projects/" + projectId + "/members").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "eve@test.com"))))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/tickets/" + ticketId).header("Authorization", "Bearer " + dev2Token))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/tickets/" + ticketId).header("Authorization", "Bearer " + devToken))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/tickets/" + ticketId).header("Authorization", "Bearer " + devToken))
                .andExpect(status().isNotFound());
    }

    private ResultActions search(long projectId, String token, String query) throws Exception {
        return mvc.perform(get("/api/projects/" + projectId + "/tickets" + query)
                .header("Authorization", "Bearer " + token));
    }

    /** Registers a user and returns its JWT. */
    private String register(String name, String email) throws Exception {
        String body = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", name, "email", email, "password", "Passw0rd!"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    private String json(Object o) throws Exception {
        return om.writeValueAsString(o);
    }
}

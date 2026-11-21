package com.nithin.issuetracker.config;

import com.nithin.issuetracker.entity.Comment;
import com.nithin.issuetracker.entity.Project;
import com.nithin.issuetracker.entity.ProjectMember;
import com.nithin.issuetracker.entity.Ticket;
import com.nithin.issuetracker.entity.User;
import com.nithin.issuetracker.enums.Priority;
import com.nithin.issuetracker.enums.ProjectRole;
import com.nithin.issuetracker.enums.Role;
import com.nithin.issuetracker.enums.TicketStatus;
import com.nithin.issuetracker.enums.TicketType;
import com.nithin.issuetracker.repository.CommentRepository;
import com.nithin.issuetracker.repository.ProjectMemberRepository;
import com.nithin.issuetracker.repository.ProjectRepository;
import com.nithin.issuetracker.repository.TicketRepository;
import com.nithin.issuetracker.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Loads demo data into an EMPTY database when app.seed.enabled=true (dev profile / docker-compose).
 * Demo logins: admin@demo.com / Admin@123, manager@demo.com / Manager@123, dev@demo.com / Developer@123
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final PasswordEncoder encoder;

    private int counter = 0;

    public DataSeeder(UserRepository userRepository, ProjectRepository projectRepository,
                      ProjectMemberRepository memberRepository, TicketRepository ticketRepository,
                      CommentRepository commentRepository, PasswordEncoder encoder) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.ticketRepository = ticketRepository;
        this.commentRepository = commentRepository;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }
        User admin = userRepository.save(new User("Admin User", "admin@demo.com", encoder.encode("Admin@123"), Role.ADMIN));
        User manager = userRepository.save(new User("Maya Manager", "manager@demo.com", encoder.encode("Manager@123"), Role.MANAGER));
        User dev = userRepository.save(new User("Dev Dillon", "dev@demo.com", encoder.encode("Developer@123"), Role.DEVELOPER));
        User priya = userRepository.save(new User("Priya Nair", "priya@demo.com", encoder.encode("Developer@123"), Role.DEVELOPER));

        Project project = new Project();
        project.setName("Demo Project");
        project.setProjectKey("DEMO");
        project.setDescription("Sample project with demo tickets. Drag cards between columns!");
        project.setOwner(manager);
        projectRepository.save(project);

        memberRepository.save(new ProjectMember(project, manager, ProjectRole.MANAGER));
        memberRepository.save(new ProjectMember(project, dev, ProjectRole.DEVELOPER));
        memberRepository.save(new ProjectMember(project, priya, ProjectRole.DEVELOPER));

        Ticket t1 = ticket(project, "Login page crashes on empty password", TicketType.BUG, Priority.CRITICAL,
                TicketStatus.IN_PROGRESS, 1000, dev, manager, "Submitting the login form with an empty password throws a 500 instead of a validation message.");
        ticket(project, "Add password reset flow", TicketType.STORY, Priority.HIGH,
                TicketStatus.TODO, 1000, priya, manager, "Users should be able to reset a forgotten password by email.");
        ticket(project, "Dashboard charts overflow on mobile", TicketType.BUG, Priority.MEDIUM,
                TicketStatus.TODO, 2000, null, dev, "The status chart is cut off below 400px width.");
        ticket(project, "Write API documentation", TicketType.TASK, Priority.LOW,
                TicketStatus.TODO, 3000, dev, manager, "Document all endpoints in Swagger with examples.");
        ticket(project, "Set up CI pipeline", TicketType.TASK, Priority.HIGH,
                TicketStatus.IN_PROGRESS, 2000, priya, manager, "Run tests and build on every push.");
        ticket(project, "Project key validation", TicketType.TASK, Priority.MEDIUM,
                TicketStatus.DONE, 1000, dev, manager, "Keys must be 2-10 alphanumeric characters.");
        ticket(project, "Choose database for production", TicketType.STORY, Priority.MEDIUM,
                TicketStatus.DONE, 2000, manager, manager, "Decision: PostgreSQL.");

        project.setTicketCounter(counter);
        projectRepository.save(project);

        comment(t1, manager, "Can you take a look at this one today? It blocks the demo.");
        comment(t1, dev, "On it. Looks like a missing @NotBlank on the request DTO.");
    }

    private Ticket ticket(Project project, String title, TicketType type, Priority priority, TicketStatus status,
                          double order, User assignee, User reporter, String description) {
        Ticket t = new Ticket();
        t.setProject(project);
        t.setNumber(++counter);
        t.setTitle(title);
        t.setDescription(description);
        t.setType(type);
        t.setPriority(priority);
        t.setStatus(status);
        t.setSortOrder(order);
        t.setAssignee(assignee);
        t.setReporter(reporter);
        if (priority == Priority.CRITICAL || priority == Priority.HIGH) {
            t.setDueDate(LocalDate.now().plusDays(5));
        }
        return ticketRepository.save(t);
    }

    private void comment(Ticket ticket, User author, String text) {
        Comment c = new Comment();
        c.setTicket(ticket);
        c.setAuthor(author);
        c.setText(text);
        commentRepository.save(c);
    }
}

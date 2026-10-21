import os

base_dir = "/Users/BHARATSHAHI/Desktop/College-project/backend/src/main/java/com/smartwaste"

files = {
    f"{base_dir}/entity/Role.java": """package com.smartwaste.entity;
public enum Role {
    ADMIN, AUTHORITY, COLLECTOR, USER
}
""",
    f"{base_dir}/entity/User.java": """package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(unique = true, nullable = false)
    private String email;
    private String phone;
    @Column(nullable = false)
    private String password;
    @Enumerated(EnumType.STRING)
    private Role role;
    private String profileImage;
    private Boolean isActive = true;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
        updatedAt = createdAt;
    }
    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}
""",
    f"{base_dir}/entity/Dustbin.java": """package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "dustbins")
public class Dustbin {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String deviceId;
    private String name;
    private String locationName;
    private Double latitude;
    private Double longitude;
    private Integer capacityLiters;
    private Double fillLevel = 0.0;
    private String status = "EMPTY";
    private String wasteType;
    private Double temperature;
    private Double humidity;
    private Double airQuality;
    private Double moisture;
    private Double batteryLevel;
    private ZonedDateTime lastSeen;
    private Boolean isActive = true;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
        updatedAt = createdAt;
    }
    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}
""",
    f"{base_dir}/entity/SensorReading.java": """package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "sensor_readings")
public class SensorReading {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dustbin_id", nullable = false)
    private Dustbin dustbin;
    
    private Double fillLevel;
    private Double temperature;
    private Double humidity;
    private Double airQuality;
    private Double moisture;
    private Double batteryLevel;
    private ZonedDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) recordedAt = ZonedDateTime.now();
    }
}
""",
    f"{base_dir}/entity/Alert.java": """package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "alerts")
public class Alert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dustbin_id")
    private Dustbin dustbin;
    
    private String alertType;
    private String severity;
    private String message;
    private Boolean isResolved = false;
    private ZonedDateTime createdAt;
    private ZonedDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }
}
""",
    f"{base_dir}/entity/CollectionTask.java": """package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "collection_tasks")
public class CollectionTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dustbin_id")
    private Dustbin dustbin;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collector_id")
    private User collector;
    
    private String status = "PENDING";
    private String priority = "LOW";
    private ZonedDateTime assignedAt;
    private ZonedDateTime collectedAt;
    private String notes;
}
""",
    f"{base_dir}/entity/Complaint.java": """package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "complaints")
public class Complaint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dustbin_id")
    private Dustbin dustbin;
    
    private String title;
    private String description;
    private String imageUrl;
    private String status = "OPEN";
    private String priority = "MEDIUM";
    private ZonedDateTime createdAt;
    private ZonedDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }
}
""",
    f"{base_dir}/repository/UserRepository.java": """package com.smartwaste.repository;

import com.smartwaste.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
""",
    f"{base_dir}/repository/DustbinRepository.java": """package com.smartwaste.repository;

import com.smartwaste.entity.Dustbin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DustbinRepository extends JpaRepository<Dustbin, Long> {
    Optional<Dustbin> findByDeviceId(String deviceId);
}
""",
    f"{base_dir}/repository/SensorReadingRepository.java": """package com.smartwaste.repository;

import com.smartwaste.entity.SensorReading;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {
}
""",
    f"{base_dir}/repository/AlertRepository.java": """package com.smartwaste.repository;

import com.smartwaste.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertRepository extends JpaRepository<Alert, Long> {
}
""",
    f"{base_dir}/repository/CollectionTaskRepository.java": """package com.smartwaste.repository;

import com.smartwaste.entity.CollectionTask;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollectionTaskRepository extends JpaRepository<CollectionTask, Long> {
}
""",
    f"{base_dir}/repository/ComplaintRepository.java": """package com.smartwaste.repository;

import com.smartwaste.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
}
""",
    f"{base_dir}/dto/LoginRequest.java": """package com.smartwaste.dto;
import lombok.Data;
@Data
public class LoginRequest {
    private String email;
    private String password;
}
""",
    f"{base_dir}/dto/AuthResponse.java": """package com.smartwaste.dto;
import lombok.Data;
import lombok.AllArgsConstructor;
import com.smartwaste.entity.Role;
@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private Long userId;
    private String name;
    private Role role;
}
""",
    f"{base_dir}/dto/SensorDataDto.java": """package com.smartwaste.dto;
import lombok.Data;
@Data
public class SensorDataDto {
    private String deviceId;
    private Double fillLevel;
    private Double temperature;
    private Double humidity;
    private Double airQuality;
    private Double moisture;
    private Double batteryLevel;
    private Double latitude;
    private Double longitude;
}
""",
    f"{base_dir}/config/SecurityConfig.java": """package com.smartwaste.config;

import com.smartwaste.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/iot/**").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("*")); // Should use specific origins in prod
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
""",
    f"{base_dir}/security/JwtService.java": """package com.smartwaste.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, String userEmail) {
        final String username = extractUsername(token);
        return (username.equals(userEmail)) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }
}
""",
    f"{base_dir}/security/JwtAuthenticationFilter.java": """package com.smartwaste.security;

import com.smartwaste.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, CustomUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            userEmail = jwtService.extractUsername(jwt);
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
                if (jwtService.isTokenValid(jwt, userDetails.getUsername())) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Ignore invalid tokens
        }
        filterChain.doFilter(request, response);
    }
}
""",
    f"{base_dir}/security/CustomUserDetailsService.java": """package com.smartwaste.security;

import com.smartwaste.entity.User;
import com.smartwaste.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
""",
    f"{base_dir}/websocket/WebSocketConfig.java": """package com.smartwaste.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();
    }
}
""",
    f"{base_dir}/iot/IoTService.java": """package com.smartwaste.iot;

import com.smartwaste.dto.SensorDataDto;
import com.smartwaste.entity.Dustbin;
import com.smartwaste.entity.SensorReading;
import com.smartwaste.entity.Alert;
import com.smartwaste.repository.DustbinRepository;
import com.smartwaste.repository.SensorReadingRepository;
import com.smartwaste.repository.AlertRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.ZonedDateTime;

@Service
public class IoTService {

    private final DustbinRepository dustbinRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final AlertRepository alertRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public IoTService(DustbinRepository dustbinRepository, SensorReadingRepository sensorReadingRepository,
                      AlertRepository alertRepository, SimpMessagingTemplate messagingTemplate) {
        this.dustbinRepository = dustbinRepository;
        this.sensorReadingRepository = sensorReadingRepository;
        this.alertRepository = alertRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public void processSensorData(SensorDataDto data) {
        Dustbin dustbin = dustbinRepository.findByDeviceId(data.getDeviceId())
                .orElse(null);
        
        if (dustbin == null) {
            // Can optionally create auto-registration here if needed
            throw new RuntimeException("Device not found: " + data.getDeviceId());
        }

        // Update dustbin state
        dustbin.setFillLevel(data.getFillLevel());
        dustbin.setTemperature(data.getTemperature());
        dustbin.setHumidity(data.getHumidity());
        dustbin.setAirQuality(data.getAirQuality());
        dustbin.setMoisture(data.getMoisture());
        dustbin.setBatteryLevel(data.getBatteryLevel());
        dustbin.setLastSeen(ZonedDateTime.now());
        if (data.getLatitude() != null && data.getLongitude() != null) {
            dustbin.setLatitude(data.getLatitude());
            dustbin.setLongitude(data.getLongitude());
        }

        // Calculate Status
        if (data.getFillLevel() >= 95) dustbin.setStatus("OVERFLOW");
        else if (data.getFillLevel() >= 90) dustbin.setStatus("FULL");
        else if (data.getFillLevel() >= 75) dustbin.setStatus("HIGH");
        else if (data.getFillLevel() >= 50) dustbin.setStatus("MEDIUM");
        else if (data.getFillLevel() >= 20) dustbin.setStatus("LOW");
        else dustbin.setStatus("EMPTY");
        
        // Calculate Waste Type (simplistic algorithm based on moisture)
        if (data.getMoisture() != null) {
            if (data.getMoisture() > 60) dustbin.setWasteType("WET");
            else if (data.getMoisture() < 30) dustbin.setWasteType("DRY");
            else dustbin.setWasteType("MIXED");
        }

        dustbinRepository.save(dustbin);

        // Save History
        SensorReading reading = new SensorReading();
        reading.setDustbin(dustbin);
        reading.setFillLevel(data.getFillLevel());
        reading.setTemperature(data.getTemperature());
        reading.setHumidity(data.getHumidity());
        reading.setAirQuality(data.getAirQuality());
        reading.setMoisture(data.getMoisture());
        reading.setBatteryLevel(data.getBatteryLevel());
        sensorReadingRepository.save(reading);

        // Check Alerts
        checkAlerts(dustbin);

        // Broadcast to Dashboard
        messagingTemplate.convertAndSend("/topic/dustbins", dustbin);
    }

    private void checkAlerts(Dustbin dustbin) {
        if ("OVERFLOW".equals(dustbin.getStatus())) {
            createAlert(dustbin, "BIN_OVERFLOW", "CRITICAL", "Dustbin is overflowing");
        } else if ("FULL".equals(dustbin.getStatus())) {
            createAlert(dustbin, "BIN_FULL", "HIGH", "Dustbin is full");
        }
        
        if (dustbin.getAirQuality() != null && dustbin.getAirQuality() > 200) {
            createAlert(dustbin, "AIR_QUALITY", "HIGH", "Critical air quality / gas detected");
        }
        
        if (dustbin.getBatteryLevel() != null && dustbin.getBatteryLevel() < 15) {
            createAlert(dustbin, "LOW_BATTERY", "MEDIUM", "Device battery is low");
        }
    }
    
    private void createAlert(Dustbin dustbin, String type, String severity, String message) {
        Alert alert = new Alert();
        alert.setDustbin(dustbin);
        alert.setAlertType(type);
        alert.setSeverity(severity);
        alert.setMessage(message);
        alertRepository.save(alert);
        messagingTemplate.convertAndSend("/topic/alerts", alert);
    }
}
""",
    f"{base_dir}/controller/IoTController.java": """package com.smartwaste.controller;

import com.smartwaste.dto.SensorDataDto;
import com.smartwaste.iot.IoTService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/iot")
public class IoTController {

    private final IoTService ioTService;

    public IoTController(IoTService ioTService) {
        this.ioTService = ioTService;
    }

    @PostMapping("/sensor-data")
    public ResponseEntity<?> receiveSensorData(@RequestBody SensorDataDto data) {
        try {
            // Basic validation
            if (data.getDeviceId() == null || data.getDeviceId().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "deviceId is required"));
            }
            
            ioTService.processSensorData(data);
            return ResponseEntity.ok(Map.of("success", true, "message", "Sensor data received"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
""",
    f"{base_dir}/controller/AuthController.java": """package com.smartwaste.controller;

import com.smartwaste.dto.LoginRequest;
import com.smartwaste.dto.AuthResponse;
import com.smartwaste.entity.User;
import com.smartwaste.repository.UserRepository;
import com.smartwaste.security.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);
                
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
        
        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getName(), user.getRole()));
    }
}
""",
    f"{base_dir}/controller/DustbinController.java": """package com.smartwaste.controller;

import com.smartwaste.entity.Dustbin;
import com.smartwaste.repository.DustbinRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/dustbins")
public class DustbinController {
    
    private final DustbinRepository repository;

    public DustbinController(DustbinRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Dustbin> getAll() {
        return repository.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Dustbin> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
""",
    f"{base_dir}/controller/AnalyticsController.java": """package com.smartwaste.controller;

import com.smartwaste.repository.DustbinRepository;
import com.smartwaste.repository.AlertRepository;
import com.smartwaste.repository.CollectionTaskRepository;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    
    private final DustbinRepository dustbinRepo;
    private final AlertRepository alertRepo;
    private final CollectionTaskRepository taskRepo;

    public AnalyticsController(DustbinRepository dustbinRepo, AlertRepository alertRepo, CollectionTaskRepository taskRepo) {
        this.dustbinRepo = dustbinRepo;
        this.alertRepo = alertRepo;
        this.taskRepo = taskRepo;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalBins = dustbinRepo.count();
        long fullBins = dustbinRepo.findAll().stream().filter(b -> "FULL".equals(b.getStatus()) || "OVERFLOW".equals(b.getStatus())).count();
        long openAlerts = alertRepo.findAll().stream().filter(a -> !a.getIsResolved()).count();
        
        stats.put("totalDustbins", totalBins);
        stats.put("fullDustbins", fullBins);
        stats.put("openAlerts", openAlerts);
        // Additional stats could be populated
        return stats;
    }
}
"""
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
print("Backend Scaffolded successfully!")

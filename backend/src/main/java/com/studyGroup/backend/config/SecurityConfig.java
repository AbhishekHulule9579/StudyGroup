package com.studyGroup.backend.config;

import com.studyGroup.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http) throws Exception {
        AuthenticationManagerBuilder authenticationManagerBuilder =
                http.getSharedObject(AuthenticationManagerBuilder.class);
        // Use the autowired passwordEncoder bean from AppConfig
        authenticationManagerBuilder.userDetailsService(userService).passwordEncoder(passwordEncoder);
        return authenticationManagerBuilder.build();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. Apply the global CORS configuration
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // 2. Disable CSRF, as we are using stateless JWT authentication
                .csrf(csrf -> csrf.disable())
                // 3. Configure authorization rules
                .authorizeHttpRequests(authz -> authz
                        // Allow all public endpoints for registration, login, and password reset
                        .requestMatchers("/api/users/register/**", "/api/users/signin", "/api/users/forgot-password/**").permitAll()
                        // Allow OPTIONS requests for CORS pre-flight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // All other requests must be authenticated
                        .anyRequest().authenticated()
                )
                // 4. Set session management to stateless
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        // Note: The JWT filter would be added here once you implement it.
        // http.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Allow requests from any origin. For production, you might want to restrict this
        // to your frontend's URL, e.g., "https://my-frontend.up.railway.app"
        configuration.setAllowedOrigins(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
/*
package com.studyGroup.backend.config;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthFilter authFilter;

    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            // Disable CSRF for API and SockJS endpoints (we use stateless JWT)
            .csrf(csrf -> csrf.disable())

            .authorizeHttpRequests(auth -> auth
                // Permit WebSocket handshake/info endpoints and app/topic used by STOMP/SockJS
                .requestMatchers(
                    "/ws", // Explicitly permit the base WebSocket endpoint
                    "/ws/**",
                    "/ws/info/**",
                    "/topic/**",
                    "/app/**",
                    "/api/users/signin",
                    "/api/users/register/**",
                    "/api/users/forgot-password/**",
                    "/api/courses/**"
                ).permitAll()
                // All document routes should require authentication
                .requestMatchers("/api/documents/**").authenticated()

                .anyRequest().authenticated()
            )
            // Ensure sessions are stateless (required for JWT)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // The JWT filter runs before authentication attempts on protected routes
            .addFilterBefore(authFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Add your deployed frontend URL here. The localhost URL is for local development.
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:5173",
            "https://beautiful-insight-production.up.railway.app"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        // CRITICAL FIX: Allow credentials (JWT header) for both REST and WebSocket
        configuration.setAllowCredentials(true); 
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
    */
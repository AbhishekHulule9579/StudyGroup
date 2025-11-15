package com.studyGroup.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.studyGroup.backend.service.JWTService;
import com.studyGroup.backend.service.UserService;

import java.io.IOException;
import java.util.Arrays;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Autowired
    private JWTService jwtService;

    @Autowired
    private UserService userService;

    // Define public paths that the filter should ignore
    private final AntPathRequestMatcher[] publicEndpoints = {
            new AntPathRequestMatcher("/api/users/register/**"),
            new AntPathRequestMatcher("/api/users/signin"),
            new AntPathRequestMatcher("/api/users/forgot-password/**"),
            new AntPathRequestMatcher("/api/courses/**"),
            new AntPathRequestMatcher("/ws"),
            new AntPathRequestMatcher("/ws/**"),
            new AntPathRequestMatcher("/ws/info"),
            new AntPathRequestMatcher("/ws/info/**")
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // If the request path matches a public endpoint, skip the filter logic
        if (Arrays.stream(publicEndpoints).anyMatch(matcher -> matcher.matches(request))) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        String token = null;
        String username = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
            username = jwtService.validateToken(token);
        }

        if (username != null && !"401".equals(username) && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userService.loadUserByUsername(username);

            if (userDetails != null && username.equals(userDetails.getUsername())) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
     
        filterChain.doFilter(request, response);
    }
}

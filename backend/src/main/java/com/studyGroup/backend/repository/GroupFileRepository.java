package com.studyGroup.backend.repository;

import com.studyGroup.backend.model.GroupFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GroupFileRepository extends JpaRepository<GroupFile, Long> {
    List<GroupFile> findByGroup_GroupId(Long groupId);
}

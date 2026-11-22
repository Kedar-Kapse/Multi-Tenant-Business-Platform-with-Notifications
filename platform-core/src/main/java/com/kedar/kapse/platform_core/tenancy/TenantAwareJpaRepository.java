package com.kedar.kapse.platform_core.tenancy;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import org.hibernate.annotations.TenantId;
import org.springframework.data.jpa.repository.support.JpaEntityInformation;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Base class for every Spring Data repository (see @EnableJpaRepositories
 * repositoryBaseClass in the services).
 *
 * Hibernate filters QUERIES by the current hospital for @TenantId entities, but a
 * plain load by primary key (findById -> EntityManager.find) is not filtered in
 * this Hibernate version -- so hospital B could open or edit hospital A's record
 * if it knew the id. Here, for tenant-owned entities, findById / existsById /
 * getReferenceById go through a query, which Hibernate does filter. deleteById
 * uses findById, so it is covered too.
 */
public class TenantAwareJpaRepository<T, ID> extends SimpleJpaRepository<T, ID> {

    private static final Map<Class<?>, Boolean> TENANT_SCOPED = new ConcurrentHashMap<>();

    private final JpaEntityInformation<T, ?> entityInformation;
    private final EntityManager entityManager;

    public TenantAwareJpaRepository(JpaEntityInformation<T, ?> entityInformation, EntityManager entityManager) {
        super(entityInformation, entityManager);
        this.entityInformation = entityInformation;
        this.entityManager = entityManager;
    }

    @Override
    public Optional<T> findById(ID id) {
        if (id == null || !isTenantScoped(entityInformation.getJavaType())) {
            return super.findById(id);
        }
        String idName = entityInformation.getIdAttribute() != null ? entityInformation.getIdAttribute().getName() : "id";
        List<T> rows = entityManager
                .createQuery("select e from " + entityInformation.getEntityName() + " e where e." + idName + " = :id",
                        entityInformation.getJavaType())
                .setParameter("id", id)
                .setMaxResults(1)
                .getResultList();
        return rows.stream().findFirst();
    }

    @Override
    public boolean existsById(ID id) {
        return isTenantScoped(entityInformation.getJavaType()) ? findById(id).isPresent() : super.existsById(id);
    }

    @Override
    public T getReferenceById(ID id) {
        if (!isTenantScoped(entityInformation.getJavaType())) {
            return super.getReferenceById(id);
        }
        return findById(id).orElseThrow(() -> new EntityNotFoundException(
                entityInformation.getEntityName() + " not found"));
    }

    /** true when the entity (or a superclass) has a field annotated @TenantId. */
    static boolean isTenantScoped(Class<?> type) {
        return TENANT_SCOPED.computeIfAbsent(type, t -> {
            for (Class<?> c = t; c != null && c != Object.class; c = c.getSuperclass()) {
                for (Field f : c.getDeclaredFields()) {
                    if (f.isAnnotationPresent(TenantId.class)) return true;
                }
            }
            return false;
        });
    }
}

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

public class VerifyMain {
    public static void run() throws Exception {
        MemoryPostService service = new MemoryPostService();
        try (LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean()) {
            validator.afterPropertiesSet();
            MockMvc mvc = MockMvcBuilders.standaloneSetup(new PostController(service))
                    .setValidator(validator).build();

            MvcResult list = mvc.perform(get("/api/posts")).andReturn();
            Verification.check("return postService.findAll();",
                    "GET /api/posts → " + status(list) + " " + body(list));

            MvcResult found = mvc.perform(get("/api/posts/3")).andReturn();
            Verification.check("return postService.find(id);",
                    "GET /api/posts/3 → " + status(found) + " " + body(found));

            MvcResult created = mvc.perform(post("/api/posts")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"New\",\"body\":\"Body\"}")).andReturn();
            Verification.check("ResponseEntity.created(",
                    "POST /api/posts → " + status(created) + ", Location: "
                    + created.getResponse().getHeader("Location"));
            require(body(created).equals("{\"id\":4,\"title\":\"New\"}"), "POST 반환 본문");

            MvcResult deleted = mvc.perform(delete("/api/posts/3")).andReturn();
            Verification.check("postService.delete(id);",
                    "DELETE /api/posts/3 → " + status(deleted));
            require(body(deleted).isEmpty(), "204 응답은 본문이 없어야 한다");
            require(service.deleted.equals(3L), "실제 서비스 삭제 호출");

            require(mvc.perform(post("/api/posts").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"\",\"body\":\"Body\"}"))
                    .andReturn().getResponse().getStatus() == 400, "@Valid가 빈 제목을 거절해야 한다");
            require(mvc.perform(get("/api/posts/999")).andReturn().getResponse().getStatus() == 404,
                    "없는 글 조회는 404");
        }
    }
    private static String body(MvcResult result) throws Exception {
        return result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    }
    private static String status(MvcResult result) {
        int code = result.getResponse().getStatus();
        return code + " " + HttpStatus.valueOf(code).getReasonPhrase();
    }
    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    private static class MemoryPostService implements PostService {
        private final Map<Long, PostResponse> posts = new java.util.LinkedHashMap<>(Map.of(3L, new PostResponse(3L, "Hello")));
        private Long deleted;
        public List<PostResponse> findAll() { return new ArrayList<>(posts.values()); }
        public PostResponse find(Long id) {
            PostResponse value = posts.get(id);
            if (value == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            return value;
        }
        public PostResponse create(PostRequest request) {
            PostResponse value = new PostResponse(4L, request.title());
            posts.put(value.id(), value);
            return value;
        }
        public void delete(Long id) { deleted = id; posts.remove(id); }
    }
}

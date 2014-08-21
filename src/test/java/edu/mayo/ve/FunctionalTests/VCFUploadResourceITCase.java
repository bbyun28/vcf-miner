package edu.mayo.ve.FunctionalTests;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mongodb.BasicDBObject;
import com.mongodb.DB;
import com.mongodb.DBCollection;
import edu.mayo.concurrency.workerQueue.WorkerPool;
import edu.mayo.util.MongoConnection;
import edu.mayo.ve.SecurityUserAppHelper;
import edu.mayo.ve.VCFLoaderPool;
import edu.mayo.ve.VCFParser.LoadWorker;
import edu.mayo.ve.VCFParser.VCFParser;
import edu.mayo.ve.resources.ExeQuery;
import edu.mayo.ve.resources.VCFUploadResource;
import edu.mayo.ve.resources.WorkerPoolManager;
import edu.mayo.ve.util.Tokens;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;

import javax.ws.rs.core.Response;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Random;

import static junit.framework.Assert.assertEquals;
import static org.mockito.Matchers.anyString;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.*;

public class VCFUploadResourceITCase {

    private final static long   RANDOM_LONG         = (new Random(System.currentTimeMillis()).nextLong());
    private final static String DUMMY_USER_ID       = "user_id_" + RANDOM_LONG;
    private final static String DUMMY_USER_TOKEN    = "user_token_" + RANDOM_LONG;
    private final static String DUMMY_ALIAS         = "alias_" + RANDOM_LONG;

    private SecurityUserAppHelper mockHelper;

    private static WorkerPool wp;

    @BeforeClass
    public static void setupLoaderPool() {
        LoadWorker logic = new LoadWorker(new VCFParser(), 50000);
        wp = new WorkerPool(logic, 1);
        VCFLoaderPool.setWp(wp);
        WorkerPoolManager.registerWorkerPool(Tokens.VCF_WORKERS, wp);
    }

    @AfterClass
    public static void tearDownLoaderPool() throws InterruptedException {
        wp.shutdown(1);
    }

    @Before
    public void setupMocks() throws Exception {
        mockHelper = mock(SecurityUserAppHelper.class);

        // mockito's way of mocking a method (e.g. registerWorkspace()) that returns void
        doNothing().when(mockHelper).registerWorkspace(eq(DUMMY_USER_ID), eq(DUMMY_USER_TOKEN), anyString(), eq(DUMMY_ALIAS));
    }


    @Test
    public void uploadFile() throws Exception {

        VCFUploadResource uploadResource = new VCFUploadResource(mockHelper);

        File vcf = new File("src/test/resources/testData/VCFUploadResourceITCase.vcf");
        InputStream inStream = new FileInputStream(vcf);

        String reporting = "FALSE";
        String compression = vcf.getName();
        Response r = uploadResource.uploadFile(DUMMY_USER_ID, DUMMY_ALIAS, reporting, compression, DUMMY_USER_TOKEN, inStream);

        verify(mockHelper).registerWorkspace(eq(DUMMY_USER_ID), eq(DUMMY_USER_TOKEN), anyString(), eq(DUMMY_ALIAS));

        //get the workspace id from the raw response and check there is one variant in there
        String json = r.getEntity().toString().replaceAll("File uploaded and workspace constructed :","");
        JsonElement jelement = new JsonParser().parse(json);
        JsonObject jobject = jelement.getAsJsonObject();
        String key = jobject.getAsJsonPrimitive("key").getAsString();
        assertEquals(1, count(key));

        System.out.println(key);

    }

    private long count(String workspace){
        ExeQuery q = new ExeQuery();
        DB db = MongoConnection.getDB();
        DBCollection col = db.getCollection(workspace);
        long count = q.countResults(col, new BasicDBObject());
        return count;
    }
}

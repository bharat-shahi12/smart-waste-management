import java.sql.*;

public class Query {
    public static void main(String[] args) {
        String url = System.getenv("DATABASE_URL");
        String user = System.getenv("DATABASE_USERNAME");
        String password = System.getenv("DATABASE_PASSWORD");
        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT email, password, role FROM users WHERE role = 'COLLECTOR'");
            while (rs.next()) {
                System.out.println("Email: " + rs.getString("email") + " | Role: " + rs.getString("role"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

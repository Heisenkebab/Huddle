import TabBar from "@/components/TabBar";
import styles from "@/components/AppShell.module.css";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <main className={styles.content}>{children}</main>
      <TabBar />
    </div>
  );
}

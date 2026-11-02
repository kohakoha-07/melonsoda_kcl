import Image from "next/image";
import styles from "./meloop-logo.module.css";

export default function MeloopLogo() {
  return (
    <span className={styles.logo}>
      <Image
        src="/meloop-logo.png"
        alt="meloop"
        width={2172}
        height={724}
        sizes="(max-width: 760px) 160px, 210px"
        className={styles.image}
      />
    </span>
  );
}

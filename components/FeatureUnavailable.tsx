import ErrorNotice from "./ErrorNotice";
import PageHeader from "./PageHeader";

/** Trip page that isn't available (yet), with a header; the sidebar/tab bar stay. */
export default function FeatureUnavailable({
  title,
  text,
}: {
  title: string;
  text?: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <ErrorNotice text={text} />
    </>
  );
}

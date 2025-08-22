import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.css"; // Vibrant code theme

const MarkdownRenderer = ({ content }) => {
  return (
    <div className="markdown-container rounded-lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // Add remarkMath here
        rehypePlugins={[rehypeHighlight]} // Add rehypeKatex here
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="mb-2 text-2xl font-bold text-white" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="mt-4 mb-2 text-xl font-bold text-white" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p
              className="text-opacity-90 mb-0 leading-relaxed text-white"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul
              className="mb-4 list-disc space-y-1 pl-6 text-white"
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li className="text-white marker:text-white" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-accent-foreground underline underline-offset-4 hover:text-accent-foreground"
              {...props}
            />
          ),
          code: ({ node, inline, className, ...props }) => (
            <code
              className={`${className} ${
                inline
                  ? "rounded-md bg-gray-800 px-2 py-1 text-white"
                  : "block rounded-xl bg-gray-800 px-4 py-2 text-white"
              }`}
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <table
              className="my-6 w-full border-collapse rounded-lg border border-white"
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              className="border border-white bg-accent p-3 text-left text-white"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-white p-3 text-white" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="bg-opacity-50 my-4 border-l-4 border-white bg-accent/10 py-2 pl-4 text-white italic"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

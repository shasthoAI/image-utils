import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";

type Props = React.PropsWithChildren<{
  title: string;
  actions?: React.ReactNode;
  description?: string;
}>;

export const Section: React.FC<Props> = ({ title, actions, description, children }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 w-full">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};


import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "./Button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>测试按钮</Button>);
    expect(screen.getByText("测试按钮")).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>点击我</Button>);

    fireEvent.click(screen.getByText("点击我"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies correct variant styles", () => {
    const { rerender } = render(<Button variant="primary">按钮</Button>);
    expect(screen.getByText("按钮")).toHaveClass("bg-primary");

    rerender(<Button variant="secondary">按钮</Button>);
    expect(screen.getByText("按钮")).toHaveClass("bg-secondary");
  });
});

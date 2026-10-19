import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input, acceptsDecimalDraft, normalizeDecimalText } from "./input";

function ControlledDecimal({ initial = 0 }: { initial?: number }) {
  const [value, setValue] = React.useState(initial);
  const [unrelated, setUnrelated] = React.useState(0);
  return (
    <>
      <Input
        type="number"
        step="0.01"
        aria-label="Custo do material"
        value={value}
        onChange={(event) => {
          setValue(Number(event.target.value) || 0);
          setUnrelated(current => current + 1);
        }}
      />
      <output data-testid="calculated">{value}</output>
      <output data-testid="updates">{unrelated}</output>
    </>
  );
}

describe("Entradas decimais no Centro de Custo", () => {
  it("aceita números com vírgula, ponto e estados intermediários", () => {
    expect(acceptsDecimalDraft("20,")).toBe(true);
    expect(acceptsDecimalDraft("20.50")).toBe(true);
    expect(acceptsDecimalDraft(",5")).toBe(true);
    expect(acceptsDecimalDraft("")).toBe(true);
    expect(acceptsDecimalDraft("20,,2")).toBe(false);
    expect(normalizeDecimalText("20,50")).toBe("20.50");
  });

  it("permite digitar 20,50 sem perder foco, sem apagar vírgula ou zeros", () => {
    render(<ControlledDecimal />);
    const input = screen.getByRole("textbox", { name: "Custo do material" }) as HTMLInputElement;
    fireEvent.focus(input);
    for (const draft of ["2", "20", "20,", "20,5", "20,50"]) {
      fireEvent.change(input, { target: { value: draft } });
      expect(input).toHaveValue(draft);
      expect(input).toHaveFocus();
    }
    expect(screen.getByTestId("calculated")).toHaveTextContent("20.5");
    expect(screen.getByTestId("updates")).toHaveTextContent("5");
    fireEvent.blur(input);
    expect(input).toHaveValue("20.5");
  });

  it("não quebra edição de valores com ponto e casas adicionais", () => {
    render(<ControlledDecimal initial={10.81} />);
    const input = screen.getByRole("textbox", { name: "Custo do material" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "0.0001" } });
    expect(input).toHaveValue("0.0001");
    expect(screen.getByTestId("calculated")).toHaveTextContent("0.0001");
    fireEvent.blur(input);
    expect(input).toHaveValue("0.0001");
  });

  it("preserva digitação parcial e restaura valor normalizado ao sair", () => {
    render(<ControlledDecimal initial={50} />);
    const input = screen.getByRole("textbox", { name: "Custo do material" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "20," } });
    expect(input).toHaveValue("20,");
    expect(screen.getByTestId("calculated")).toHaveTextContent("20");
    fireEvent.blur(input);
    expect(input).toHaveValue("20");
  });

  it("mantém entradas textuais normais sem alteração de comportamento", () => {
    render(<Input type="text" aria-label="Descrição" defaultValue="Tijolos" />);
    const input = screen.getByRole("textbox", { name: "Descrição" });
    fireEvent.change(input, { target: { value: "Cimento" } });
    expect(input).toHaveValue("Cimento");
  });
});

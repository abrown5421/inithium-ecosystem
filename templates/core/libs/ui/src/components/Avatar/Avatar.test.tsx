import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders initials derived from a multi-word name by default', () => {
    render(<Avatar source={{ variant: 'initials', name: 'Jane Doe' }} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders the first two characters for a single-word name', () => {
    render(<Avatar source={{ variant: 'initials', name: 'Cher' }} />);
    expect(screen.getByText('CH')).toBeInTheDocument();
  });

  it('renders an image when given an image source', () => {
    render(<Avatar source={{ variant: 'image', url: 'https://example.com/avatar.png', alt: 'Jane Doe' }} />);
    const img = screen.getByRole('img', { name: 'Jane Doe' });
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
  });

  it('renders a DiceBear image built from style/seed/options', () => {
    render(
      <Avatar
        source={{
          variant: 'dicebear',
          style: 'bottts',
          seed: 'jane-doe',
          options: { backgroundColor: 'b6e3f4' },
          alt: 'Jane Doe',
        }}
      />,
    );
    const img = screen.getByRole('img', { name: 'Jane Doe' });
    expect(img.getAttribute('src')).toContain('https://api.dicebear.com/9.x/bottts/svg?');
    expect(img.getAttribute('src')).toContain('seed=jane-doe');
    expect(img.getAttribute('src')).toContain('backgroundColor=b6e3f4');
  });

  it('applies the given size in pixels to both dimensions', () => {
    const { container } = render(<Avatar source={{ variant: 'initials', name: 'Jane Doe' }} size={200} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe('200px');
    expect(root.style.height).toBe('200px');
  });

  it('renders a plain div when no onClick is given', () => {
    const { container } = render(<Avatar source={{ variant: 'initials', name: 'Jane Doe' }} />);
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it('renders a clickable button and fires onClick when given one', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Avatar source={{ variant: 'initials', name: 'Jane Doe' }} onClick={handleClick} />);

    const button = screen.getByRole('button');
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('defaults to a circle and switches shape classes for square', () => {
    const { container, rerender } = render(<Avatar source={{ variant: 'initials', name: 'Jane Doe' }} />);
    expect(container.firstElementChild).toHaveClass('rounded-full');

    rerender(<Avatar source={{ variant: 'initials', name: 'Jane Doe' }} styleConfig={{ shape: 'square' }} />);
    expect(container.firstElementChild).toHaveClass('rounded-lg');
  });
});

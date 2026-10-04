// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InvisFieldingLandingPage from '../src/InvisFieldingLandingPage.jsx';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const fill = () => fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'Person@Example.com' } });
const submit = () => fireEvent.submit(screen.getByLabelText('Email address').closest('form'));

describe('interest form', () => {
  it('prevents unconfigured registrations', () => {
    render(<InvisFieldingLandingPage />);
    expect(screen.getByRole('button', { name: 'Get early access updates' }).disabled).toBe(true);
    expect(screen.getByText(/Registration isn’t connected/)).toBeTruthy();
  });
  it('waits for confirmed storage and blocks repeated submits while pending', async () => {
    let resolve;
    const fetch = vi.fn(() => new Promise(done => { resolve = done; }));
    vi.stubGlobal('fetch', fetch);
    render(<InvisFieldingLandingPage signupEndpoint="https://test.example/signup" />);
    fill(); submit(); submit();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('You’re on the interest list.')).toBeNull();
    expect(screen.getByRole('button', { name: /Joining/ }).disabled).toBe(true);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: 'person@example.com' });
    resolve({ ok: true, json: async () => ({ ok: true }) });
    await screen.findByText('You’re on the interest list.');
    await waitFor(() => expect(document.activeElement.getAttribute('role')).toBe('status'));
  });
  it.each([
    ['storage rejection', () => Promise.resolve({ ok: false, json: async () => ({ ok: false }) })],
    ['false acknowledgment', () => Promise.resolve({ ok: true, json: async () => ({ ok: false }) })],
    ['network failure', () => Promise.reject(new Error('offline'))],
    ['invalid response', () => Promise.resolve({ ok: true, json: async () => { throw new Error('not json'); } })],
  ])('retains input and permits retry after %s', async (_name, failure) => {
    const fetch = vi.fn().mockImplementationOnce(failure).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetch);
    render(<InvisFieldingLandingPage signupEndpoint="https://test.example/signup" />);
    fill(); submit();
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Email address').value).toBe('Person@Example.com');
    expect(screen.queryByText('You’re on the interest list.')).toBeNull();
    submit(); await screen.findByText('You’re on the interest list.');
  });
  it('rejects invalid emails without sending', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<InvisFieldingLandingPage signupEndpoint="https://test.example/signup" />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'invalid' } }); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/valid email/));
    expect(fetch).not.toHaveBeenCalled();
  });
});

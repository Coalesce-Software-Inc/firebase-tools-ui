/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Portal } from '@rmwc/base';
import {
  act,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import React from 'react';
import { Route } from 'react-router-dom';

import { delay } from '../../test_utils';
import { confirm } from '../common/DialogQueue';
import Collection, {
  CollectionPresentation,
  withCollectionState,
} from './Collection';
import { useCollectionFilter } from './store';
import { renderWithFirestore } from './testing/FirestoreTestProviders';

jest.mock('../common/DialogQueue');
jest.mock('./store');

describe('CollectionPanel', () => {
  it('shows the collection name', async () => {
    const { getByText } = await renderWithFirestore(async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'cool-doc-1'), { a: 1 });
      const collectionSnapshot = await getDocs(collectionRef);
      const docs = collectionSnapshot.docs;

      return (
        <>
          <Portal />
          <CollectionPresentation
            collection={collectionRef}
            collectionFilter={undefined}
            addDocument={async () => {}}
            docs={docs}
            missingDocs={[]}
            url={'/foo'}
          />
        </>
      );
    });

    expect(getByText(/my-stuff/)).not.toBeNull();
  });

  it('shows filter when filter button is clicked', async () => {
    const { getByText } = await renderWithFirestore(async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'cool-doc-1'), { a: 1 });
      const collectionSnapshot = await getDocs(collectionRef);
      const docs = collectionSnapshot.docs;

      return (
        <>
          <Portal />
          <CollectionPresentation
            collection={collectionRef}
            collectionFilter={undefined}
            addDocument={async () => {}}
            docs={docs}
            missingDocs={[]}
            url={'/foo'}
          />
        </>
      );
    });

    await act(async () => {
      getByText('filter_list').click();
    });

    expect(getByText(/Filter by field/)).not.toBeNull();
  });
});

it('filters documents for single-value filters', async () => {
  (useCollectionFilter as jest.Mock).mockReturnValue({
    field: 'foo',
    operator: '==',
    value: 'bar',
  });

  const { getByText, queryByText, findByText } = await renderWithFirestore(
    async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'doc-with'), { foo: 'bar' });
      await setDoc(doc(collectionRef, 'doc-without'), { foo: 'not-bar' });

      return (
        <>
          <Portal />
          <Collection collection={collectionRef} />
        </>
      );
    }
  );

  await findByText(/doc-with/);

  expect(getByText(/doc-with/)).not.toBeNull();
  expect(queryByText(/doc-without/)).toBeNull();
});

it('filters documents for single-value not operator filters', async () => {
  (useCollectionFilter as jest.Mock).mockReturnValue({
    field: 'foo',
    operator: '!=',
    value: 'bar',
  });

  const { getByText, queryByText, findByText } = await renderWithFirestore(
    async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'doc-with'), { foo: 'not-bar' });
      await setDoc(doc(collectionRef, 'doc-without'), { foo: 'bar' });

      return (
        <>
          <Portal />
          <Collection collection={collectionRef} />
        </>
      );
    }
  );

  await findByText(/doc-with/);

  expect(getByText(/doc-with/)).not.toBeNull();
  expect(queryByText(/doc-without/)).toBeNull();
});

it('filters documents for multi-value filters', async () => {
  (useCollectionFilter as jest.Mock).mockReturnValue({
    field: 'foo',
    operator: 'in',
    values: ['eggs', 'spam'],
  });

  const { getByText, queryByText, findByText } = await renderWithFirestore(
    async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'doc-with'), { foo: 'eggs' });
      await setDoc(doc(collectionRef, 'doc-without'), { foo: 'not-eggs' });

      return (
        <>
          <Portal />
          <Collection collection={collectionRef} />
        </>
      );
    }
  );

  await findByText(/doc-with/);

  expect(getByText(/doc-with/)).not.toBeNull();
  expect(queryByText(/doc-without/)).toBeNull();
});

it('filters documents for multi-value not operator filters', async () => {
  (useCollectionFilter as jest.Mock).mockReturnValue({
    field: 'foo',
    operator: 'not-in',
    values: ['eggs', 'spam'],
  });

  const { getByText, queryByText, findByText } = await renderWithFirestore(
    async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'doc-with'), { foo: 'not-eggs' });
      await setDoc(doc(collectionRef, 'doc-without'), { foo: 'eggs' });

      return (
        <>
          <Portal />
          <Collection collection={collectionRef} />
        </>
      );
    }
  );

  await findByText(/doc-with/);

  expect(getByText(/doc-with/)).not.toBeNull();
  expect(queryByText(/doc-without/)).toBeNull();
});

it('sorts documents when filtered', async () => {
  (useCollectionFilter as jest.Mock).mockReturnValue({
    field: 'foo',
    sort: 'asc',
  });

  const { queryAllByText, findByText } = await renderWithFirestore(
    async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'doc-z'), { foo: 'z' });
      await setDoc(doc(collectionRef, 'doc-a'), { foo: 'a' });
      await setDoc(doc(collectionRef, 'doc-b'), { foo: 'b' });

      return (
        <>
          <Portal />
          <Collection collection={collectionRef} />
        </>
      );
    }
  );

  await findByText(/doc-a/);

  expect(queryAllByText(/doc-a|doc-b|doc-z/).map((e) => e.textContent)).toEqual(
    ['doc-a', 'doc-b', 'doc-z']
  );
});
it('limits documents in a collection to specified value', async () => {
  const { queryAllByText, findByText } = await renderWithFirestore(
    async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'doc-z'), { foo: 'z' });
      await setDoc(doc(collectionRef, 'doc-a'), { foo: 'a' });
      await setDoc(doc(collectionRef, 'doc-b'), { foo: 'b' });

      return (
        // Wrong props right?
        <>
          <Portal />
          <Collection
            collection={collectionRef}
            maxFetchedDocumentsPerCollection={2}
          />
        </>
      );
    }
  );
  await findByText(/doc-a/);
  await findByText(/doc-b/);
  // The number of results is limited to 2 above, expect only a + b.
  expect(queryAllByText(/doc-a|doc-b|doc-z/).map((e) => e.textContent)).toEqual(
    ['doc-a', 'doc-b']
  );
});

it('shows the missing documents', async () => {
  const { getByText, findByText } = await renderWithFirestore(
    async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'hidden/deep/cool-doc-1'), { a: 1 });

      return (
        <>
          <Collection collection={collectionRef} />
          <Portal />
        </>
      );
    },
    {
      path: '/hidden',
    }
  );

  await findByText(/hidden/);

  expect(getByText(/hidden/)).not.toBeNull();
});

it('shows the selected sub-document', async () => {
  const { queryAllByText, getByText } = await renderWithFirestore(
    async (firestore) => {
      const collectionRef = collection(firestore, 'my-stuff');
      await setDoc(doc(collectionRef, 'cool-doc-1'), { a: 1 });

      return (
        <>
          <Collection collection={collectionRef} />
          <Portal />
        </>
      );
    },
    {
      path: '//cool-doc-1',
    }
  );

  // One match in CollectionList, one for doc panel header.
  await waitFor(() => expect(queryAllByText(/cool-doc-1/)).toHaveLength(2));

  expect(getByText(/my-stuff/)).not.toBeNull();
});

it('deletes collection and nested data when requested', async () => {
  const { findByRole, queryByText } = await renderWithFirestore(
    async (firestore) => {
      const collectionRef = collection(firestore, 'whose-stuff');
      const docRef = doc(collectionRef, 'cool-doc');
      await setDoc(docRef, { myField: 1 });

      return (
        <>
          <Collection collection={collectionRef} />
          <Portal />
        </>
      );
    }
  );

  const menu = await findByRole('button', { name: 'Menu' });
  await act(() => {
    menu.click();
    return delay(200);
  });

  (confirm as jest.Mock).mockResolvedValueOnce(true);

  const deleteDocument = await findByRole('menuitem', {
    name: 'Delete collection',
  });

  act(() => {
    deleteDocument.click();
  });

  await waitForElementToBeRemoved(() => queryByText(/cool-doc/), {
    timeout: 2000,
  });

  expect(queryByText(/cool-doc/)).toBeNull();
}, 10000);

describe('withCollectionState', () => {
  let performAddDocument: (id?: string) => Promise<void>;
  const MyCollection = withCollectionState(({ addDocument }) => {
    performAddDocument = (id = 'new-document-id') =>
      addDocument({ id, data: {} });
    return <div data-testid="withCollectionState" />;
  });

  it('redirects to a newly created document', async () => {
    const { findByTestId, getByText } = await renderWithFirestore(
      async (firestore) => {
        const collectionRef = collection(firestore, 'my-stuff');

        return (
          <>
            <Portal />
            <Route path="/my-stuff">
              <MyCollection collection={collectionRef} />
            </Route>
            <Route path="/my-stuff/new-document-id">_redirected_to_foo_</Route>
          </>
        );
      },
      {
        path: '/my-stuff',
      }
    );

    await findByTestId('withCollectionState');

    await act(performAddDocument);

    expect(getByText(/_redirected_to_foo_/)).not.toBeNull();
  });

  it('redirects to a newly created document when a child is active', async () => {
    const { findByTestId, getByText } = await renderWithFirestore(
      async (firestore) => {
        const collectionRef = collection(firestore, 'my-stuff');

        return (
          <>
            <Portal />
            <Route path="/my-stuff">
              <MyCollection collection={collectionRef} />
            </Route>
            <Route path="/my-stuff/new-document-id">_redirected_to_foo_</Route>
          </>
        );
      },
      {
        path: '/my-stuff/my-doc/sub-coll',
      }
    );

    await findByTestId('withCollectionState');

    await act(performAddDocument);

    expect(getByText(/_redirected_to_foo_/)).not.toBeNull();
  });

  it('redirects to a newly created document when a child is active and the document id has special characters', async () => {
    const { findByTestId, getByText } = await renderWithFirestore(
      async (firestore) => {
        const collectionRef = collection(firestore, 'my-stuff');

        return (
          <>
            <Portal />
            <Route path="/my-stuff">
              <MyCollection collection={collectionRef} />
            </Route>
            <Route path="/my-stuff/new-document-id-%40%23%24">
              _redirected_to_foo_
            </Route>
          </>
        );
      },
      {
        path: '/my-stuff/my-doc/sub-coll',
      }
    );

    await findByTestId('withCollectionState');

    await act(() => performAddDocument('new-document-id-@#$'));

    expect(getByText(/_redirected_to_foo_/)).not.toBeNull();
  });

  // TODO: This test tracks the ideal behavior of the issue #442:
  //          Error on the Firestore viewer when trying to decode URI containing the character '%'.
  it.skip('redirects to a newly created document when a child is active and the document id has the special character %', async () => {
    const { findByTestId, getByText } = await renderWithFirestore(
      async (firestore) => {
        const collectionRef = collection(firestore, 'my-stuff');

        return (
          <>
            <Portal />
            <Route path="/my-stuff">
              <MyCollection collection={collectionRef} />
            </Route>
            <Route path="/my-stuff/new-document-id-%40%23%24%25">
              _redirected_to_foo_
            </Route>
          </>
        );
      },
      {
        path: '/my-stuff/my-doc/sub-coll',
      }
    );

    await findByTestId('withCollectionState');

    await act(() => performAddDocument('new-document-id-@#$%'));

    expect(getByText(/_redirected_to_foo_/)).not.toBeNull();
  });
});

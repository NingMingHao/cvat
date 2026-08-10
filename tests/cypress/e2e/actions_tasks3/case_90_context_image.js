// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { generateString } from '../../support/utils';

context('Context images for 2D tasks.', () => {
    const caseId = '90';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'color';
    const pathToArchive = `../../${__dirname}/assets/case_90/case_90_context_image.zip`;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, pathToArchive);
        cy.openTaskJob(taskName);
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check a context image.', () => {
            cy.get('.cvat-context-image-wrapper').should('exist').and('be.visible');
            cy.get('.cvat-player-next-button').click();
            cy.get('.cvat-context-image-wrapper').should('exist').and('be.visible'); // Check a context image on the second frame
            cy.get('.cvat-player-previous-button').click();
        });

        it('Related image overlay is initially disabled.', () => {
            cy.get('#cvat_canvas_related_image').should('not.be.visible');
            cy.get('.cvat-canvas-image-setups-trigger').click();
            cy.get('.cvat-related-image-overlay-enabled input').should('not.be.checked');
        });

        it('Enable the related image overlay without intercepting canvas interaction.', () => {
            cy.get('.cvat-related-image-overlay-enabled').click();
            cy.get('#cvat_canvas_related_image')
                .should('be.visible')
                .and('have.css', 'pointer-events', 'none')
                .and('have.css', 'opacity', '0.5');
            cy.get('#cvat_canvas_related_image').then(([overlay]) => {
                const bounds = overlay.getBoundingClientRect();
                cy.document().then((document) => {
                    expect(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2))
                        .not.to.equal(overlay);
                });
            });
            cy.get('.cvat-context-image-wrapper').should('exist').and('be.visible');
        });

        it('Keep the overlay aligned while zooming and panning.', () => {
            const compareGeometry = () => {
                cy.get('#cvat_canvas_background').then(([background]) => {
                    cy.get('#cvat_canvas_related_image').then(([relatedImage]) => {
                        expect(relatedImage.style.top).to.equal(background.style.top);
                        expect(relatedImage.style.left).to.equal(background.style.left);
                        expect(relatedImage.style.width).to.equal(background.style.width);
                        expect(relatedImage.style.height).to.equal(background.style.height);
                        expect(relatedImage.style.transform).to.equal(background.style.transform);
                    });
                });
            };

            compareGeometry();
            cy.get('.cvat-canvas-container').trigger('wheel', { deltaY: 5 });
            compareGeometry();
            cy.get('.cvat-canvas-container').trigger('mousedown', { button: 1 });
            cy.get('.cvat-canvas-container').trigger('mousemove', 500, 500);
            cy.get('.cvat-canvas-container').trigger('mouseup', { button: 1 });
            compareGeometry();
        });

        it('Update opacity without redrawing or replacing the overlay element.', () => {
            cy.get('.cvat-canvas-image-setups-trigger').click();
            cy.get('.cvat-related-image-overlay-opacity').within(() => {
                cy.get('[role="slider"]').type(generateString(10, 'rightarrow'));
                cy.get('[role="slider"]').should('have.attr', 'aria-valuenow', 60);
            });
            cy.get('#cvat_canvas_related_image').should('have.css', 'opacity', '0.6');
        });

        it('Replace the overlay when the frame changes without breaking the context image.', () => {
            cy.get('#cvat_canvas_related_image').then(([overlay]) => {
                const firstFrame = overlay.toDataURL();
                cy.get('.cvat-player-next-button').click();
                cy.get('#cvat_canvas_related_image').should('be.visible').then(([nextOverlay]) => {
                    expect(nextOverlay.toDataURL()).not.to.equal(firstFrame);
                });
            });
            cy.get('.cvat-context-image-wrapper').should('exist').and('be.visible');
        });

        it('Disable and clear the related image overlay.', () => {
            cy.get('.cvat-canvas-image-setups-trigger').click();
            cy.get('.cvat-related-image-overlay-enabled').click();
            cy.get('#cvat_canvas_related_image').should('not.be.visible');
        });
    });
});

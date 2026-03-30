import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/story_viewer.dart';

class StoryViewScreen extends StatelessWidget {
  const StoryViewScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(
          body: Column(
            children: <Widget>[
              Expanded(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(0),
                    child: StoryViewer(
                      title: state.selectedStoryLabel,
                      subtitle: 'Story viewer preview',
                      statusText: state.selectedStoryStatus,
                      primaryLabel: 'Back to feed',
                      secondaryLabel: 'Next story',
                      onPrimary: () {
                        context.read<InstaBlocBloc>().add(CloseOverlayInstaBlocEvent());
                      },
                      onSecondary: () {
                        context.read<InstaBlocBloc>().add(NextStoryInstaBlocEvent());
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
